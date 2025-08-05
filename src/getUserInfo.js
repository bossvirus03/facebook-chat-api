"use strict";

const utils = require("../utils");
const log = require("npmlog");

function formatData(data) {
  const retObj = {};

  for (const prop in data) {
    if (data.hasOwnProperty(prop)) {
      const innerObj = data[prop];
      retObj[prop] = {
        name: innerObj.name,
        firstName: innerObj.firstName,
        vanity: innerObj.vanity,
        thumbSrc: innerObj.thumbSrc,
        profileUrl: innerObj.uri,
        gender: innerObj.gender,
        type: innerObj.type,
        isFriend: innerObj.is_friend,
        isBirthday: !!innerObj.is_birthday,
        searchTokens: innerObj.searchTokens,
        alternateName: innerObj.alternateName
      };
    }
  }

  return retObj;
}

module.exports = function (defaultFuncs, api, ctx) {
  return async function getUserInfo(id) {
    if (!utils.isOfType(id, ["Number", "String", "Array"])) {
      throw new utils.FcaError({
        error: `The first argument (id) must be a Number, String, or an Array of them, not ${utils.getType(id)} (${id}).`
      });
    }
    if (utils.getType(id) !== "Array") {
      id = [id];
    }

    const form = {};
    for (let i = 0; i < id.length; i++) {
      const v = id[i];
      if (utils.getType(v) !== "String") {
        throw new utils.FcaError({
          error: `Elements of the first argument (id) must be Strings, not ${utils.getType(v)} (${v}) at index ${i}.`
        });
      }
      form["ids[" + i + "]"] = v;
    }

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/chat/user_info/",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return formatData(resData.payload.profiles);
    } catch (err) {
      log.error("getUserInfo", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
