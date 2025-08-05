"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function changeBio(bio, publish = false) {
    if (utils.getType(publish) !== "Boolean") {
      publish = false;
    }

    if (utils.getType(bio) !== "String") {
      bio = "";
      publish = false;
    }

    const form = {
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "ProfileCometSetBioMutation",
      // This doc_is is valid as of May 23, 2020
      doc_id: "2725043627607610",
      variables: JSON.stringify({
        input: {
          bio: bio,
          publish_bio_feed_story: publish,
          actor_id: ctx.i_userID || ctx.userID,
          client_mutation_id: Math.round(Math.random() * 1024).toString()
        },
        hasProfileTileViewID: false,
        profileTileViewID: null,
        scale: 1
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

      return true;
    } catch (err) {
      log.error("changeBio", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
