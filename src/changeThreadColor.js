"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function changeThreadColor(threadID, color) {
    if (!utils.isOfType(threadID, ["Number", "String"])) {
      throw new utils.FcaError({
        error: `The first argument (threadID) must be a Number or String, not ${utils.getType(threadID)} (${threadID}).`
      });
    }
    threadID = String(threadID);

    if (utils.getType(color) === "Number") {
      color = String(color);
    }

    const form = {
      dpr: 1,
      queries: JSON.stringify({
        o0: {
          //This doc_id is valid as of January 31, 2020
          doc_id: "1727493033983591",
          query_params: {
            data: {
              actor_id: ctx.i_userID || ctx.userID,
              client_mutation_id: "0",
              source: "SETTINGS",
              theme_id: color,
              thread_id: threadID
            }
          }
        }
      })
    };

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/api/graphqlbatch/",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData[resData.length - 1].error_results > 0) {
        throw new utils.FcaError(resData[0].o0.errors);
      }

      return resData[0].o0.data;
    } catch (err) {
      log.error("changeThreadColor", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
