"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function addUserToGroup(threadID, userIDs) {
    if (!utils.isOfType(threadID, ["Number", "String"])) {
      throw new utils.FcaError({
        error: `The first argument (threadID) must be a Number or String, not ${utils.getType(threadID)} (${threadID}).`
      });
    }
    threadID = String(threadID);

    if (!utils.isOfType(userIDs, ["Number", "String", "Array"])) {
      throw new utils.FcaError({
        error: `The second argument (userIDs) must be a Number or String or an Array of them, not ${utils.getType(userIDs)} (${userIDs}).`
      });
    }

    if (!utils.isOfType(userIDs, "Array")) {
      userIDs = [userIDs];
    }

    const messageAndOTID = utils.generateOfflineThreadingID();
    const form = {
      client: "mercury",
      action_type: "ma-type:log-message",
      author: "fbid:" + (ctx.i_userID || ctx.userID),
      thread_id: "",
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
      is_spoof_warning: false,
      source: "source:chat:web",
      "source_tags[0]": "source:chat",
      log_message_type: "log:subscribe",
      status: "0",
      offline_threading_id: messageAndOTID,
      message_id: messageAndOTID,
      threading_id: utils.generateThreadingID(ctx.clientID),
      manual_retry_cnt: "0",
      thread_fbid: threadID
    };

    for (let i = 0; i < userIDs.length; i++) {
      const u = userIDs[i];
      const uType = utils.getType(u);
      if (uType !== "Number" && uType !== "String") {
        throw new utils.FcaError({
          error: `Elements of the second argument (userIDs) must be a Number or String, not ${uType} (${u}) at index: ${i}.`
        });
      }

      form[`log_message_data[added_participants][${i}]`] = `fbid:${u}`;
    }

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/messaging/send/",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return true;
    } catch (err) {
      log.error("addUserToGroup", err);
      // check if the error is utils.FcaError
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
