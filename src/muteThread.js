"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  // muteSecond: -1=permanent mute, 0=unmute, 60=one minute, 3600=one hour, etc.
  return async function muteThread(threadID, muteSeconds) {
    if (!utils.isOfType(threadID, ["Number", "String"])) {
      throw new utils.FcaError({
        error: `The first argument (threadID) must be a Number or String, not ${utils.getType(threadID)} (${threadID}).`
      });
    }
    threadID = String(threadID);

    const form = {
      thread_fbid: threadID,
      mute_settings: muteSeconds
    };

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/ajax/mercury/change_mute_thread.php",
        ctx.jar,
        form
      );
      await utils.saveCookies(ctx.jar)(resData);
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return true;
    } catch (err) {
      log.error("muteThread", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
