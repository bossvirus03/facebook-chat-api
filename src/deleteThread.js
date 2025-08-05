"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function deleteThread(threadIDs) {
    if (!utils.isOfType(threadIDs, ["String", "Array"])) {
      throw new utils.FcaError({
        error: `The first argument (threadIDs) must be a String or an Array of them, not ${utils.getType(threadIDs)} (${threadIDs}).`
      });
    }

    const form = {
      client: "mercury"
    };

    if (utils.getType(threadIDs) !== "Array") {
      threadIDs = [threadIDs];
    }

    for (let i = 0; i < threadIDs.length; i++) {
      if (utils.getType(threadIDs[i]) !== "String") {
        throw new utils.FcaError({
          error: `Elements of the first argument (threadIDs) must be Strings, not ${utils.getType(threadIDs[i])} (${threadIDs[i]}) at index ${i}.`
        });
      }
      form["ids[" + i + "]"] = String(threadIDs[i]);
    }

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/ajax/mercury/delete_thread.php",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }
    } catch (err) {
      log.error("deleteThread", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
