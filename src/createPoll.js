"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function createPoll(threadID, title, options) {
    if (!utils.isOfType(threadID, ["Number", "String"])) {
      throw new utils.FcaError({
        error: `The first argument (threadID) must be a Number or String, not ${utils.getType(threadID)} (${threadID}).`
      });
    }
    threadID = String(threadID);

    if (!utils.isOfType(title, "String")) {
      throw new utils.FcaError({
        error: `The second argument (title) must be a String, not ${utils.getType(title)} (${title}).`
      });
    }

    if (!options) {
      options = {}; // Initial poll options are optional
    }

    const form = {
      target_id: threadID,
      question_text: title
    };

    // Set fields for options (and whether they are selected initially by the posting user)
    let ind = 0;
    for (const opt in options) {
      if (options.hasOwnProperty(opt)) {
        form["option_text_array[" + ind + "]"] = opt;
        form["option_is_selected_array[" + ind + "]"] = options[opt]
          ? "1"
          : "0";
        ind++;
      }
    }

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/messaging/group_polling/create_poll/?dpr=1",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.payload.status !== "success") {
        throw new utils.FcaError(resData);
      }
    } catch (err) {
      log.error("createPoll", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
