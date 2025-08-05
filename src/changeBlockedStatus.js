"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function changeBlockedStatus(userID, blockStatus) {
    if (!utils.isOfType(userID, ["Number", "String"])) {
      throw new Error(
        "The first argument (userID) must be a number or string."
      );
    }

    if (!utils.isOfType(blockStatus, "Boolean")) {
      throw new Error("The second argument (blockStatus) must be a boolean.");
    }

    const form = {
      fbid: userID
    };

    try {
      const resData = await defaultFuncs.post(
        `https://www.facebook.com/messaging/${blockStatus ? "" : "un"}block_messages/`,
        ctx.jar,
        form
      );

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return true;
    } catch (err) {
      log.error("changeBlockedStatus", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
