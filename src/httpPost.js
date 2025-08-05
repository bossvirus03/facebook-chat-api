"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function httpPost(url, form, customHeader, notAPI) {
    if (utils.getType(url) !== "String") {
      throw new utils.FcaError({
        error: `The first argument (url) must be a String, not ${utils.getType(url)} (${url}).`
      });
    }

    customHeader = customHeader || {};

    try {
      let resData;
      if (notAPI) {
        resData = await utils.post(
          url,
          ctx.jar,
          form,
          ctx.globalOptions,
          ctx,
          customHeader
        );
      } else {
        resData = await defaultFuncs.post(url, ctx.jar, form, {}, customHeader);
      }
      return resData.body.toString();
    } catch (err) {
      log.error("httpPost", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
