"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function handleFriendRequest(userID, accept) {
    if (!utils.isOfType(userID, ["Number", "String"])) {
      throw new utils.FcaError({
        error: `The first argument (userID) must be a Number or String, not ${utils.getType(userID)} (${userID}).`
      });
    }
    if (utils.getType(accept) !== "Boolean") {
      throw new utils.FcaError({
        error: `The second argument (accept) must be a Boolean, not ${utils.getType(accept)} (${accept}).`
      });
    }

    const form = {
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "FriendingCometFriendRequestConfirmMutation",
      doc_id: "7303313029748461",
      variables: JSON.stringify({
        input: {
          friend_requester_id: String(userID),
          source: "friends_tab",
          actor_id: ctx.i_userID || ctx.userID,
          client_mutation_id: Math.round(Math.random() * 1024).toString()
        },
        scale: 1,
        refresh_num: 0
      }),
      av: ctx.i_userID || ctx.userID
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

      return resData;
    } catch (err) {
      log.error("handleFriendRequest", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
