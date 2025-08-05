"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function createNewGroup(participantIDs, groupTitle) {
    if (utils.getType(participantIDs) !== "Array") {
      throw new utils.FcaError({
        error: `The first argument (participantIDs) must be an Array, not ${utils.getType(participantIDs)} (${participantIDs}).`
      });
    }

    if (participantIDs.length < 2) {
      throw new utils.FcaError({
        error:
          "The first argument (participantIDs) must have at least 2 elements."
      });
    }

    const pids = [
      {
        fbid: ctx.i_userID || ctx.userID
      }
    ];
    for (let i = 0; i < participantIDs.length; i++) {
      const pType = utils.getType(participantIDs[i]);
      if (pType !== "Number" && pType !== "String") {
        throw new utils.FcaError({
          error: `Elements of the first argument (participantIDs) must be Numbers or Strings, not ${pType} (${participantIDs[i]}) at index ${i}.`
        });
      }
      pids.push({
        fbid: participantIDs[i]
      });
    }

    const form = {
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "MessengerGroupCreateMutation",
      av: ctx.i_userID || ctx.userID,
      //This doc_id is valid as of January 11th, 2020
      doc_id: "577041672419534",
      variables: JSON.stringify({
        input: {
          entry_point: "jewel_new_group",
          actor_id: ctx.i_userID || ctx.userID,
          participants: pids,
          client_mutation_id: Math.round(Math.random() * 1024).toString(),
          thread_settings: {
            name: groupTitle,
            joinable_mode: "PRIVATE",
            thread_image_fbid: null
          }
        }
      })
    };

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/api/graphql/",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return resData.data.messenger_group_thread_create.thread.thread_key
        .thread_fbid;
    } catch (err) {
      log.error("createNewGroup", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
