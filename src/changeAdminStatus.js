"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function changeAdminStatus(threadID, adminIDs, adminStatus) {
    if (!utils.isOfType(threadID, ["Number", "String"])) {
      throw new utils.FcaError({
        error: `The first argument (threadID) must be a Number or String, not ${utils.getType(threadID)} (${threadID}).`
      });
    }
    threadID = String(threadID);

    if (!utils.isOfType(adminIDs, "Array")) {
      adminIDs = [adminIDs];
    }

    if (!utils.isOfType(adminStatus, "Boolean")) {
      throw new utils.FcaError({
        error: `The third argument (adminStatus) must be a Boolean, not ${utils.getType(adminStatus)} (${adminStatus}).`
      });
    }

    const form = {
      thread_fbid: threadID,
      admin_ids: [],
      add: adminStatus
    };

    for (let i = 0; i < adminIDs.length; i++) {
      const u = adminIDs[i];
      const uType = utils.getType(u);
      if (uType !== "Number" && uType !== "String") {
        throw new utils.FcaError({
          error: `Elements of the second argument (adminIDs) must be a Number or String, not ${uType} (${u}).`
        });
      }

      form[`admin_ids[${i}]`] = u;
    }

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/messaging/save_admins/?dpr=1",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return true;
    } catch (err) {
      log.error("changeAdminStatus", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
