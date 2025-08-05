"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return function forwardAttachment(attachmentID, threadIDs) {
    if (!utils.isOfType(attachmentID, ["Number", "String", "Array"])) {
      throw new utils.FcaError({
        error: `The first argument (attachmentID) must be a Number or a String, not ${utils.getType(attachmentID)} (${attachmentID}).`
      });
    }

    const form = {
      attachment_id: attachmentID
    };

    if (utils.getType(threadIDs) !== "Array") {
      threadIDs = [threadIDs];
    }

    const timestamp = Math.floor(Date.now() / 1000);

    for (let i = 0; i < threadIDs.length; i++) {
      //That's good, the key of the array is really timestmap in seconds + index
      //Probably time when the attachment will be sent?
      if (utils.getType(threadIDs[i]) !== "String") {
        throw new utils.FcaError({
          error: `Elements of the second argument (threadIDs) must be Strings, not ${utils.getType(threadIDs[i])} (${threadIDs[i]}) at index ${i}.`
        });
      }
      form["recipient_map[" + (timestamp + i) + "]"] = threadIDs[i];
    }

    try {
      let resData = defaultFuncs.post(
        "https://www.facebook.com/mercury/attachments/forward/",
        ctx.jar,
        form
      );
      resData = utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }
    } catch (err) {
      log.error("forwardAttachment", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
