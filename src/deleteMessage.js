"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function deleteMessage(messageIDs) {
    if (!utils.isOfType(messageIDs, ["String", "Array"])) {
      throw new utils.FcaError({
        error: `The first argument (messageIDs) must be a String or an Array of them, not ${utils.getType(messageIDs)} (${messageIDs}).`
      });
    }
    const form = {
      client: "mercury"
    };

    if (utils.getType(messageIDs) !== "Array") {
      messageIDs = [messageIDs];
    }

    for (let i = 0; i < messageIDs.length; i++) {
      if (utils.getType(messageIDs[i]) !== "String") {
        throw new utils.FcaError({
          error: `Elements of the first argument (messageIDs) must be Strings, not ${utils.getType(messageIDs[i])} (${messageIDs[i]}) at index ${i}.`
        });
      }
      form["message_ids[" + i + "]"] = messageIDs[i];
    }

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/ajax/mercury/delete_messages.php",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }
    } catch (err) {
      log.error("deleteMessage", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
