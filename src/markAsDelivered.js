"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function markAsDelivered(threadID, messageID) {
    if (!utils.isOfType(threadID, ["Number", "String"])) {
      throw new utils.FcaError({
        error: `The first argument (threadID) must be a Number or String, not ${utils.getType(threadID)} (${threadID}).`
      });
    }

    if (!utils.isOfType(messageID, "String")) {
      throw new utils.FcaError({
        error: `The second argument (messageID) must be a String, not ${utils.getType(messageID)} (${messageID}).`
      });
    }

    const form = {};

    form["message_ids[0]"] = messageID;
    form[`thread_ids[${threadID}][0]`] = messageID;

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/ajax/mercury/delivery_receipts.php",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return true;
    } catch (err) {
      log.error("markAsDelivered", err);
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
