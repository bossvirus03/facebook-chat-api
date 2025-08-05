"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function unfriend(userID) {
    if (!utils.isOfType(userID, ["Number", "String"])) {
      throw new utils.FcaError({
        error: `The first argument (userID) must be a Number or String, not ${utils.getType(userID)} (${userID}).`
      });
    }

    const form = {
      uid: userID,
      unref: "bd_friends_tab",
      floc: "friends_tab",
      "nctr[_mod]": `pagelet_timeline_app_collection_${ctx.i_userID || ctx.userID}:2356318349:2`
    };

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/ajax/profile/removefriendconfirm.php",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return true;
    } catch (err) {
      log.error("unfriend", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
