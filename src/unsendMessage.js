"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function unsendMessage(messageID) {
    const form = {
      message_id: messageID
    };

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/messaging/unsend_message/",
        ctx.jar, 
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return true;
    } catch (err) {
      log.error("unsendMessage", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
