"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function changeThreadEmoji(threadID, emoji) {
    if (!utils.isOfType(threadID, ["Number", "String"])) {
      throw new utils.FcaError({
        error: `The first argument (threadID) must be a Number or String, not ${utils.getType(threadID)} (${threadID}).`
      });
    }
    threadID = String(threadID);

    const form = {
      emoji_choice: emoji,
      thread_or_other_fbid: threadID
    };

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/messaging/save_thread_emoji/?source=thread_settings&__pc=EXP1%3Amessengerdotcom_pkg",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error === 1357031) {
        throw new utils.FcaError({
          error:
            "Trying to change emoji of a chat that doesn't exist. Have at least one message in the thread before trying to change the emoji."
        });
      }

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return resData;
    } catch (err) {
      log.error("changeThreadEmoji", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
