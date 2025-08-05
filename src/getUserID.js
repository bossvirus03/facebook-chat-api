"use strict";

const utils = require("../utils");
const log = require("npmlog");

function formatData(data) {
  return {
    userID: utils.formatID(data.uid.toString()),
    photoUrl: data.photo,
    indexRank: data.index_rank,
    name: data.text,
    isVerified: data.is_verified,
    profileUrl: data.path,
    category: data.category,
    score: data.score,
    type: data.type
  };
}

module.exports = function (defaultFuncs, api, ctx) {
  return async function getUserID(name) {
    if (utils.getType(name) !== "String") {
      throw new utils.FcaError({
        error: `The first argument (name) must be a String, not ${utils.getType(name)} (${name}).`
      });
    }

    const form = {
      value: name.toLowerCase(),
      viewer: ctx.i_userID || ctx.userID,
      rsp: "search",
      context: "search",
      path: "/home.php",
      request_id: utils.getGUID()
    };

    try {
      let resData = await defaultFuncs.get(
        "https://www.facebook.com/ajax/typeahead/search.php",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return resData.payload.entries.map(formatData);
    } catch (err) {
      log.error("getUserID", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
