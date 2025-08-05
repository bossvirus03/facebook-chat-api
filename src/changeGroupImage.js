"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  async function handleUpload(image) {
    const form = {
      images_only: "true",
      "attachment[]": image
    };

    try {
      let resData = await defaultFuncs.postFormData(
        "https://upload.facebook.com/ajax/mercury/upload.php",
        ctx.jar,
        form,
        {}
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return resData.payload.metadata[0];
    } catch (err) {
      log.error("handleUpload", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  }

  return async function changeGroupImage(threadID, image) {
    if (!utils.isOfType(threadID, ["Number", "String"])) {
      throw new utils.FcaError({
        error: `The first argument (threadID) must be a Number or String, not ${utils.getType(threadID)} (${threadID}).`
      });
    }
    threadID = String(threadID);

    if (!utils.isReadableStream(image)) {
      throw new utils.FcaError(
        "The second argument (image) must be a ReadableStream."
      );
    }

    const messageAndOTID = utils.generateOfflineThreadingID();
    const form = {
      client: "mercury",
      action_type: "ma-type:log-message",
      author: "fbid:" + (ctx.i_userID || ctx.userID),
      author_email: "",
      ephemeral_ttl_mode: "0",
      is_filtered_content: false,
      is_filtered_content_account: false,
      is_filtered_content_bh: false,
      is_filtered_content_invalid_app: false,
      is_filtered_content_quasar: false,
      is_forward: false,
      is_spoof_warning: false,
      is_unread: false,
      log_message_type: "log:thread-image",
      manual_retry_cnt: "0",
      message_id: messageAndOTID,
      offline_threading_id: messageAndOTID,
      source: "source:chat:web",
      "source_tags[0]": "source:chat",
      status: "0",
      thread_fbid: threadID,
      thread_id: "",
      timestamp: Date.now(),
      timestamp_absolute: "Today",
      timestamp_relative: utils.generateTimestampRelative(),
      timestamp_time_passed: "0"
    };

    try {
      const payload = await handleUpload(image);

      form["thread_image_id"] = payload.image_id;
      form["thread_id"] = threadID;

      let resData = await defaultFuncs.post(
        "https://www.facebook.com/messaging/set_thread_image/",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return true;
    } catch (err) {
      log.error("changeGroupImage", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
