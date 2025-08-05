const utils = require("../utils");
const log = require("npmlog");

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

  const emojiSizes = {
    small: 1,
    medium: 2,
    large: 3
  };

  function handleLocation(msg, form) {
    if (msg.location) {
      if (msg.location.latitude == null || msg.location.longitude == null) {
        throw new utils.FcaError({
          error: "location property needs both latitude and longitude"
        });
      }

      form.payload.tasks[0].payload.send_type = 1;
      form.payload.tasks[0].payload.location_data = {
        coordinates: {
          latitude: msg.location.latitude,
          longitude: msg.location.longitude
        },
        is_current_location: !!msg.location.current,
        is_live_location: !!msg.location.live
      };
    }

    return true;
  }

  function handleSticker(msg, form) {
    if (msg.sticker) {
      form.payload.tasks[0].payload.send_type = 2;
      form.payload.tasks[0].payload.sticker_id = msg.sticker;
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
      if (!msg.emojiSize) {
        msg.emojiSize = "small";
      }
      if (
        msg.emojiSize !== "small" &&
        msg.emojiSize !== "medium" &&
        msg.emojiSize !== "large" &&
        (isNaN(msg.emojiSize) || msg.emojiSize < 1 || msg.emojiSize > 3)
      ) {
        throw new utils.FcaError({
          error: "emojiSize property is invalid"
        });
      }

      form.payload.tasks[0].payload.send_type = 1;
      form.payload.tasks[0].payload.text = msg.emoji;
      form.payload.tasks[0].payload.hot_emoji_size = !isNaN(msg.emojiSize)
        ? msg.emojiSize
        : emojiSizes[msg.emojiSize];
    }

    return true;
  }

  async function handleAttachment(msg, form) {
    if (msg.attachment) {
      form.payload.tasks[0].payload.send_type = 3;
      form.payload.tasks[0].payload.attachment_fbids = [];
      if (form.payload.tasks[0].payload.text == "") {
        form.payload.tasks[0].payload.text = null;
      }
      if (utils.getType(msg.attachment) !== "Array") {
        msg.attachment = [msg.attachment];
      }

      const files = await uploadAttachment(msg.attachment);
      files.forEach(function (file) {
        const key = Object.keys(file);
        const type = key[0]; // image_id, file_id, etc
        form.payload.tasks[0].payload.attachment_fbids.push(file[type]); // push the id
      });
    }

    return true;
  }

  function handleMention(msg, form) {
    if (msg.mentions) {
      form.payload.tasks[0].payload.send_type = 1;

      const arrayIds = [];
      const arrayOffsets = [];
      const arrayLengths = [];
      const mention_types = [];

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
        arrayIds.push(id);
        arrayOffsets.push(offset);
        arrayLengths.push(tag.length);
        mention_types.push("p");
      }

      form.payload.tasks[0].payload.mention_data = {
        mention_ids: arrayIds.join(","),
        mention_offsets: arrayOffsets.join(","),
        mention_lengths: arrayLengths.join(","),
        mention_types: mention_types.join(",")
      };
    }

    return true;
  }

  async function send(form, replyToMessage, resolve, reject) {
    if (replyToMessage) {
      form.payload.tasks[0].payload.reply_metadata = {
        reply_source_id: replyToMessage,
        reply_source_type: 1,
        reply_type: 0
      };
    }
    const requestId = ++ctx.wsReqNumber;
    const taskId = ++ctx.wsTaskNumber;
    const taskId2 = ++ctx.wsTaskNumber;

    form.payload.tasks[0].task_id = taskId;
    form.payload.tasks[1].task_id = taskId2;
    form.request_id = requestId;
    const threadID = form.payload.tasks[0].payload.thread_id;

    const stackTrace = new utils.FcaError();
    ctx.wsCallbacks.set(requestId, {
      stackTrace: stackTrace,
      type: "send_message",
      cb: (error, data) => {
        if (data.response.sp.includes("updateSubscriptErrorMessage")) {
          stackTrace.error = data.response.payload.step[2][2][2][1][4];

          log.error("sendMessage", stackTrace);
          reject(stackTrace);
        } else if (error) {
          for (const key in error) {
            stackTrace[key] = error[key];
          }
          log.error("sendMessageMqtt", error);
          reject(error);
        } else {
          resolve({
            messageID: data.response.payload.step[1][2][2][1][3],
            threadID: threadID,
            senderID: data.response.payload.step[3][2][2][1][2][1].toString(),
            timestamp: Date.now()
          });
        }
      },
      timeout: setTimeout(() => {
        stackTrace.error = `send_message request timed out after ${ctx.globalOptions.wsCallbackTimeout}ms`;
        reject(stackTrace);
      }, ctx.globalOptions.wsCallbackTimeout)
    });

    form.payload.tasks.forEach((task) => {
      task.payload = JSON.stringify(task.payload);
    });
    form.payload = JSON.stringify(form.payload);

    ctx.mqttClient.publish("/ls_req", JSON.stringify(form), {
      qos: 1,
      retain: false
    });
  }

  return async function sendMessageMqtt(msg, threadID, replyToMessage) {
    if (!ctx.mqttClient) {
      throw new utils.FcaError("Please connect to MQTT to use this feature");
    }

    return new Promise(async (resolve, reject) => {
      const msgType = utils.getType(msg);
      const threadIDType = utils.getType(threadID);
      const messageIDType = utils.getType(replyToMessage);

      if (!utils.isOfType(msg, ["String", "Object"])) {
        throw new utils.FcaError({
          error: `The first argument (msg) must be a String or Object, not ${msgType} (${msg}).`
        });
      }

      if (msgType === "String") {
        msg = { body: msg };
      }

      if (!utils.isOfType(threadID, ["String", "Number", "NumberString"])) {
        throw new utils.FcaError({
          error: `The second argument (threadID) must be a String or Number, not ${threadIDType} (${threadID}).`
        });
      }

      if (replyToMessage && messageIDType !== "String") {
        throw new utils.FcaError({
          error: `The third argument (replyToMessage) must be a String, not ${messageIDType} (${replyToMessage}).`
        });
      }

      // const timestamp = Date.now();
      // get full date time
      // const epoch = timestamp << 22;
      //const otid = epoch + 0; // TODO replace with randomInt(0, 2**22)
      // const otid = epoch + Math.floor(Math.random() * 4194304);
      const otid = utils.generateOfflineThreadingID();
      threadID = threadID.toString();

      const form = {
        app_id: "2220391788200892",
        payload: {
          tasks: [
            {
              label: "46",
              payload: {
                thread_id: threadID,
                otid: otid.toString(),
                source: 0,
                send_type: 1,
                sync_group: 1,
                text:
                  msg.body != null && msg.body != undefined
                    ? msg.body.toString()
                    : "",
                initiating_source: 1,
                skip_url_preview_gen: 0
              },
              queue_name: threadID,
              task_id: null,
              failure_count: null
            },
            {
              label: "21",
              payload: {
                thread_id: threadID,
                last_read_watermark_ts: Date.now(),
                sync_group: 1
              },
              queue_name: threadID,
              task_id: null,
              failure_count: null
            }
          ],
          epoch_id: parseInt(utils.generateOfflineThreadingID()),
          version_id: "6120284488008082",
          data_trace_id: null
        },
        request_id: null,
        type: 3
      };

      try {
        handleLocation(msg, form);
        handleSticker(msg, form);
        await handleAttachment(msg, form);
        // await handleUrl(msg, form);
        handleEmoji(msg, form);
        handleMention(msg, form);

        return await send(form, replyToMessage, resolve, reject);
      } catch (err) {
        log.error("sendMessage", err);
        if (err instanceof utils.FcaError) {
          throw err;
        } else {
          throw new utils.FcaError(err);
        }
      }
    });
  };
};
