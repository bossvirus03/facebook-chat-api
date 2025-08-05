"use strict";

const utils = require("../utils");

module.exports = function (defaultFuncs, api, ctx) {
  return async function searchForThread(name) {
    if (utils.getType(name) !== "String") {
      throw new utils.FcaError({
        error: `The first argument (name) must be a String, not ${utils.getType(name)} (${name}).`
      });
    }

    const tmpForm = {
      client: "web_messenger",
      query: name,
      offset: 0,
      limit: 21,
      index: "fbid"
    };

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/ajax/mercury/search_threads.php",
        ctx.jar,
        tmpForm
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error) {
        throw resData;
      }
      if (!resData.payload.mercury_payload.threads) {
        return new utils.FcaError({
          error: `Could not find thread \`${name}\`.`
        });
      }
      return resData.payload.mercury_payload.threads.map(utils.formatThread);
    } catch (err) {
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
