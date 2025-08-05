"use strict";

const utils = require("../utils");
const log = require("npmlog");

const allowedProperties = {
  attachment: true,
  url: true,
  sticker: true,
  emoji: true,
  emojiSize: true,
  body: true,
  mentions: true,
  location: true
};

function removeSpecialChar(inputString) {
  // remove char banned by facebook
  if (typeof inputString !== "string") {
    return inputString;
  }
  // Convert string to Buffer
  const buffer = Buffer.from(inputString, "utf8");

  // Filter buffer start with ef b8 8f
  let filteredBuffer = Buffer.alloc(0);
  for (let i = 0; i < buffer.length; i++) {
    if (
      buffer[i] === 0xef &&
      buffer[i + 1] === 0xb8 &&
      buffer[i + 2] === 0x8f
    ) {
      i += 2; // Skip 3 bytes of buffer starting with ef b8 8f
    } else {
      filteredBuffer = Buffer.concat([filteredBuffer, buffer.slice(i, i + 1)]);
    }
  }

  // Convert filtered buffer to string
  const convertedString = filteredBuffer.toString("utf8");

  return convertedString;
}

module.exports = function (defaultFuncs, api, ctx) {
  async function uploadAttachment(attachments) {
    const uploads = attachments.map(async (attachment, index) => {
      if (!utils.isReadableStream(attachment)) {
        throw new utils.FcaError({
          error: `Attachment should be a readable stream and not ${utils.getType(attachment)} at index ${index}`
        });
      }

      const form = {
        upload_1024: attachment,
        voice_clip: "true"
      };

      try {
        let resData = await defaultFuncs.postFormData(
          "https://upload.facebook.com/ajax/mercury/upload.php",
          ctx.jar,
          form,
          {}
        );
        resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

        if (resData.error) {
          throw new utils.FcaError(resData);
        }

        return resData.payload.metadata[0];
      } catch (err) {
        log.error("uploadAttachment", err);
        if (err instanceof utils.FcaError) {
          throw err;
        } else {
          throw new utils.FcaError(err);
        }
      }
    });

    return await Promise.all(uploads);
  }

  async function getUrl(url) {
    const form = {
      image_height: 960,
      image_width: 960,
      uri: url
    };

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/message_share_attachment/fromURI/",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error) {
        throw new utils.FcaError(resData);
      }

      if (!resData.payload) {
        throw new utils.FcaError({ error: "Invalid url" });
      }

      return resData.payload.share_data.share_params;
    } catch (err) {
      log.error("getUrl", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  }

  async function sendContent(form, threadID, isSingleUser, messageAndOTID) {
    // There are three cases here:
    // 1. threadID is of type array, where we're starting a new group chat with users
    //    specified in the array.
    // 2. User is sending a message to a specific user.
    // 3. No additional form params and the message goes to an existing group chat.
    if (utils.getType(threadID) === "Array") {
      for (let i = 0; i < threadID.length; i++) {
        form["specific_to_list[" + i + "]"] = "fbid:" + threadID[i];
      }
      form["specific_to_list[" + threadID.length + "]"] =
        "fbid:" + (ctx.i_userID || ctx.userID);
      form["client_thread_id"] = "root:" + messageAndOTID;
      log.info("sendMessage", "Sending message to multiple users: " + threadID);
    } else {
      // This means that threadID is the id of a user, and the chat
      // is a single person chat
      if (isSingleUser) {
        form["specific_to_list[0]"] = "fbid:" + threadID;
        form["specific_to_list[1]"] = "fbid:" + (ctx.i_userID || ctx.userID);
        form["other_user_fbid"] = threadID;
      } else {
        form["thread_fbid"] = threadID;
      }
    }

    if (ctx.globalOptions.pageID) {
      form["author"] = "fbid:" + ctx.globalOptions.pageID;
      form["specific_to_list[1]"] = "fbid:" + ctx.globalOptions.pageID;
      form["creator_info[creatorID]"] = ctx.i_userID || ctx.userID;
      form["creator_info[creatorType]"] = "direct_admin";
      form["creator_info[labelType]"] = "sent_message";
      form["creator_info[pageID]"] = ctx.globalOptions.pageID;
      form["request_user_id"] = ctx.globalOptions.pageID;
      form["creator_info[profileURI]"] =
        "https://www.facebook.com/profile.php?id=" +
        (ctx.i_userID || ctx.userID);
    }

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/messaging/send/",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (!resData) {
        throw new utils.FcaError({
          error: "Send message failed."
        });
      }

      if (resData.error) {
        if (resData.error === 1545012) {
          log.warn(
            "sendMessage",
            `Got error 1545012. This might mean that you're not part of the conversation ${threadID}`
          );
        } else {
          log.error("sendMessage", resData);
        }
        throw new utils.FcaError(resData);
      }

      const messageInfo = resData.payload.actions.reduce(function (p, v) {
        return (
          {
            threadID: v.thread_fbid,
            messageID: v.message_id,
            timestamp: v.timestamp
          } || p
        );
      }, null);

      return messageInfo;
    } catch (err) {
      log.error("sendMessage", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  }

  async function send(form, threadID, messageAndOTID, isGroup) {
    // We're doing a query to this to check if the given id is the id of
    // a user or of a group chat. The form will be different depending
    // on that.
    if (utils.getType(threadID) === "Array") {
      return await sendContent(form, threadID, false, messageAndOTID);
    } else {
      if (utils.getType(isGroup) != "Boolean") {
        // Removed the use of api.getUserInfo() in the old version to reduce account lockout
        return sendContent(
          form,
          threadID,
          threadID.toString().length < 16,
          messageAndOTID
        );
      } else {
        await sendContent(form, threadID, !isGroup, messageAndOTID);
      }
    }
  }

  async function handleUrl(msg, form) {
    if (msg.url) {
      try {
        const params = await getUrl(msg.url);
        form["shareable_attachment[share_params]"] = params;
      } catch (err) {
        log.error("handleUrl", err);
        throw new utils.FcaError(err);
      }
    }

    return true;
  }

  function handleLocation(msg, from) {
    if (msg.location) {
      if (msg.location.latitude == null || msg.location.longitude == null) {
        throw new utils.FcaError({
          error: "location property needs both latitude and longitude"
        });
      }

      from["location_attachment[coordinates][latitude]"] =
        msg.location.latitude;
      from["location_attachment[coordinates][longitude]"] =
        msg.location.longitude;
      from["location_attachment[is_current_location]"] = !!msg.location.current;
    }

    return true;
  }

  function handleSticker(msg, form) {
    if (msg.sticker) {
      form["sticker_id"] = msg.sticker;
    }

    return true;
  }

  function handleEmoji(msg, form) {
    if (msg.emojiSize != null && msg.emoji == null) {
      throw new utils.FcaError({
        error: "emoji property is empty"
      });
    }
    if (msg.emoji) {
      if (msg.emojiSize == null) {
        msg.emojiSize = "medium";
      }
      const emojiSizeAllowed = ["small", "medium", "large"];
      if (!emojiSizeAllowed.includes(msg.emojiSize)) {
        throw new utils.FcaError({
          error: `emojiSize must be one of ${emojiSizeAllowed.join(", ")}`
        });
      }
      if (form["body"] != null && form["body"] != "") {
        throw new utils.FcaError({
          error: "body is not empty"
        });
      }
      form["body"] = msg.emoji;
      form["tags[0]"] = "hot_emoji_size:" + msg.emojiSize;
    }

    return true;
  }

  async function handleAttachment(msg, form) {
    if (msg.attachment) {
      form["image_ids"] = [];
      form["gif_ids"] = [];
      form["file_ids"] = [];
      form["video_ids"] = [];
      form["audio_ids"] = [];

      if (utils.getType(msg.attachment) !== "Array") {
        msg.attachment = [msg.attachment];
      }

      const files = await uploadAttachment(msg.attachment);
      files.forEach(function (file) {
        const key = Object.keys(file);
        const type = key[0]; // image_id, file_id, etc
        form["" + type + "s"].push(file[type]); // push the id
      });
    }

    return true;
  }

  function handleMention(msg, form) {
    if (msg.mentions) {
      for (let i = 0; i < msg.mentions.length; i++) {
        const mention = msg.mentions[i];

        const tag = mention.tag;
        if (typeof tag !== "string") {
          throw new utils.FcaError({
            error: "Mention tags must be strings."
          });
        }

        const offset = msg.body.indexOf(tag, mention.fromIndex || 0);

        if (offset < 0) {
          log.warn(
            "handleMention",
            'Mention for "' + tag + '" not found in message string.'
          );
        }

        if (mention.id == null) {
          log.warn("handleMention", "Mention id should be non-null.");
        }

        const id = mention.id || 0;
        form["profile_xmd[" + i + "][offset]"] = offset;
        form["profile_xmd[" + i + "][length]"] = tag.length;
        form["profile_xmd[" + i + "][id]"] = id;
        form["profile_xmd[" + i + "][type]"] = "p";
      }
    }

    return true;
  }

  return async function sendMessage(msg, threadID, replyToMessage, isGroup) {
    const msgType = utils.getType(msg);
    const threadIDType = utils.getType(threadID);
    const messageIDType = utils.getType(replyToMessage);

    if (msgType !== "String" && msgType !== "Object") {
      throw new utils.FcaError({
        error: `The first argument (msg) must be a String or Object, not ${msgType} (${msg}).`
      });
    }

    if (messageIDType === "Boolean") {
      isGroup = replyToMessage;
      replyToMessage = undefined;
    }

    // Changing this to accomodate an array of users
    if (
      threadIDType !== "Array" &&
      threadIDType !== "Number" &&
      threadIDType !== "String"
    ) {
      throw new utils.FcaError({
        error: `The second argument (threadID) must be a Number, String, or Array of them, not ${threadIDType} (${threadID}).`
      });
    }

    if (replyToMessage && messageIDType !== "String") {
      throw new utils.FcaError({
        error: `The third argument (replyToMessage) must be a String, not ${messageIDType} (${replyToMessage}).`
      });
    }

    if (msgType === "String") {
      msg = { body: msg };
    }

    if (utils.getType(msg.body) === "String") {
      msg.body = removeSpecialChar(msg.body);
    }

    const disallowedProperties = Object.keys(msg).filter(
      (prop) => !allowedProperties[prop]
    );
    if (disallowedProperties.length > 0) {
      throw new utils.FcaError({
        error: `Properties not allowed: \`${disallowedProperties.join(", ")}\`, allowed properties: \`${Object.keys(allowedProperties).join(", ")}\``
      });
    }

    const messageAndOTID = utils.generateOfflineThreadingID();

    const form = {
      client: "mercury",
      action_type: "ma-type:user-generated-message",
      author: "fbid:" + (ctx.i_userID || ctx.userID),
      timestamp: Date.now(),
      timestamp_absolute: "Today",
      timestamp_relative: utils.generateTimestampRelative(),
      timestamp_time_passed: "0",
      is_unread: false,
      is_cleared: false,
      is_forward: false,
      is_filtered_content: false,
      is_filtered_content_bh: false,
      is_filtered_content_account: false,
      is_filtered_content_quasar: false,
      is_filtered_content_invalid_app: false,
      is_spoof_warning: false,
      source: "source:chat:web",
      "source_tags[0]": "source:chat",
      body: msg.body ? msg.body.toString() : "",
      html_body: false,
      ui_push_phase: "V3",
      status: "0",
      offline_threading_id: messageAndOTID,
      message_id: messageAndOTID,
      threading_id: utils.generateThreadingID(ctx.clientID),
      "ephemeral_ttl_mode:": "0",
      manual_retry_cnt: "0",
      has_attachment: !!(msg.attachment || msg.url || msg.sticker),
      signatureID: utils.getSignatureID(),
      replied_to_message_id: replyToMessage
    };

    try {
      handleLocation(msg, form);
      handleSticker(msg, form);
      await handleAttachment(msg, form);
      await handleUrl(msg, form);
      handleEmoji(msg, form);
      handleMention(msg, form);
      return await send(form, threadID, messageAndOTID, isGroup);
    } catch (err) {
      log.error("sendMessage", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
