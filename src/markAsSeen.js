"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function markAsRead(seen_timestamp) {
    if (!seen_timestamp) {
      seen_timestamp = Date.now();
    }

    const form = {
      seen_timestamp: seen_timestamp
    };

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/ajax/mercury/mark_seen.php",
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
      log.error("markAsSeen", err);
      if (utils.getType(err) == "Object" && err.error === "Not logged in.") {
        ctx.loggedIn = false;
      }
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
