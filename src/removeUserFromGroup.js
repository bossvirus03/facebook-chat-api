"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function removeUserFromGroup(threadID, userID) {
    if (!utils.isOfType(threadID, ["Number", "String"])) {
      throw new utils.FcaError({
        error: `The first argument (threadID) must be a Number or String, not ${utils.getType(threadID)} (${threadID}).`
      });
    }

    if (!utils.isOfType(userID, ["Number", "String"])) {
      throw new utils.FcaError({
        error: `The second argument (userID) must be a Number or String, not ${utils.getType(userID)} (${userID}).`
      });
    }

    const form = {
      uid: userID,
      tid: threadID
    };

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/chat/remove_participants",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return true;
    } catch (err) {
      log.error("removeUserFromGroup", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
