"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function markAsReadAll() {
    const form = {
      folder: "inbox"
    };

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/ajax/mercury/mark_folder_as_read.php",
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
      log.error("markAsReadAll", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
