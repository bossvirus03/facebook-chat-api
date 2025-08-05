"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function changeArchivedStatus(threadIDs, archive) {
    if (!utils.isOfType(threadIDs, ["Number", "String", "Array"])) {
      throw new utils.FcaError({
        error: `The first argument (threadIDs) must be a Number or String or an Array of them, not ${utils.getType(threadIDs)} (${threadIDs}).`
      });
    }

    if (!utils.isOfType(threadIDs, "Array")) {
      threadIDs = [threadIDs];
    }

    const form = {};

    for (let i = 0; i < threadIDs.length; i++) {
      const t = threadIDs[i];
      const tType = utils.getType(t);
      if (tType !== "Number" && tType !== "String") {
        throw new utils.FcaError({
          error: `Elements of the first argument (threadIDs) must be a Number or String, not ${tType} (${t}).`
        });
      }

      form[`ids[${t}]`] = archive;
    }

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/ajax/mercury/change_archived_status.php",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return true;
    } catch (err) {
      log.error("changeArchivedStatus", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
