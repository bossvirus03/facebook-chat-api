"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function changeNickname(threadID, participantID, nickname) {
    if (!utils.isOfType(threadID, ["Number", "String"])) {
      throw new utils.FcaError({
        error: `The first argument (threadID) must be a Number or String, not ${utils.getType(threadID)} (${threadID}).`
      });
    }
    threadID = String(threadID);

    if (!utils.isOfType(participantID, ["Number", "String"])) {
      throw new utils.FcaError({
        error: `The second argument (participantID) must be a Number or String, not ${utils.getType(participantID)} (${participantID}).`
      });
    }
    participantID = String(participantID);

    if (!utils.isOfType(nickname, "String")) {
      throw new utils.FcaError({
        error: `The third argument (nickname) must be a String, not ${utils.getType(nickname)} (${nickname}).`
      });
    }

    const form = {
      nickname: nickname,
      participant_id: participantID,
      thread_or_other_fbid: threadID
    };

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/messaging/save_thread_nickname/?source=thread_settings&dpr=1",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return true;
    } catch (err) {
      log.error("changeNickname", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
