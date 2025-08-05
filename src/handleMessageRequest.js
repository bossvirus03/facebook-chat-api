"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function handleMessageRequest(threadIDs, accept) {
    if (!utils.isOfType(threadIDs, ["Number", "String"])) {
      throw new utils.FcaError({
        error: `The first argument (threadIDs) must be a Number or String, not ${utils.getType(threadIDs)} (${threadIDs}).`
      });
    }

    if (!utils.isOfType(accept, "Boolean")) {
      throw new utils.FcaError({
        error: `The second argument (accept) must be a Boolean, not ${utils.getType(accept)} (${accept}).`
      });
    }

    const form = {
      client: "mercury"
    };

    if (utils.getType(threadIDs) !== "Array") {
      threadIDs = [threadIDs];
    }

    const messageBox = accept ? "inbox" : "other";

    for (let i = 0; i < threadIDs.length; i++) {
      if (utils.getType(threadIDs[i]) !== "String") {
        throw new utils.FcaError({
          error: `Elements of the first argument (threadIDs) must be Strings, not ${utils.getType(threadIDs[i])} (${threadIDs[i]}) at index ${i}.`
        });
      }
      form[`${messageBox}[${i}]`] = threadIDs[i];
    }

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/ajax/mercury/move_thread.php",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return true;
    } catch (err) {
      log.error("handleMessageRequest", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
