"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function(defaultFuncs, api, ctx) {
  const sendDelete = async (encodedId) => {
    const form = {
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "useCometFeedStoryDeleteMutation",
      doc_id: "30687873600859633",
      variables: JSON.stringify({
        input: {
          story_id: encodedId,
          story_location: "PERMALINK",
          actor_id: actorId,
          client_mutation_id: Math.round(Math.random() * 1024).toString(),
        },
        groupID: null,
        inviteShortLinkKey: null,
        renderLocation: null,
        scale: 1,
      }),
      scale: 1,
      refresh_num: 0,
      av: actorId,
      server_timestamps: true,
    };

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
  };
  return async function deletePost(postId) {
    if (!utils.isOfType(postId, ["String"])) {
      throw new utils.FcaError({
        error: `The first argument (postId) must be a String, not ${utils.getType(
          postId
        )} (${postId}).`,
      });
    }

    // Facebook's GraphQL expects a global story_id (base64).
    // Accept either a pre-encoded global id or a raw post ID.
    const rawPostId = postId.trim();
    let storyId = rawPostId;
    const looksBase64 = /^[A-Za-z0-9+/=]+$/.test(storyId);
    let isPreEncoded = false;
    if (looksBase64) {
      try {
        const decoded = Buffer.from(storyId, "base64").toString("utf8");
        // Valid if decoded string matches one of known patterns
        if (/^(S:_I\d+:\d+:\d+|story_fbid:\d+|feedback:\d+)$/i.test(decoded)) {
          isPreEncoded = true;
        }
      } catch (_) {
        // not valid base64, will encode below
      }
    }

    const actorId = ctx.i_userID || ctx.userID;
    // Primary format observed in web requests: base64("S:_I<actorId>:<postId>:<postId>")
    const makeSIEncoded = (pid) =>
      Buffer.from(`S:_I${actorId}:${pid}:${pid}`).toString("base64");
    // Fallback format: base64("story_fbid:<postId>")
    const makeStoryFbidEncoded = (pid) =>
      Buffer.from(`story_fbid:${pid}`).toString("base64");

    try {
      // Decide initial story_id to send
      let initialId;
      if (isPreEncoded) {
        initialId = storyId;
      } else {
        initialId = makeSIEncoded(rawPostId);
      }

      try {
        return await sendDelete(initialId);
      } catch (firstErr) {
        // If server says failed decoding story_id, retry with fallback format
        const failedDecoding =
          firstErr &&
          firstErr.errors &&
          Array.isArray(firstErr.errors) &&
          firstErr.errors.some((e) =>
            (e.debug_info || "")
              .toLowerCase()
              .includes("failed decoding story_id")
          );

        if (!failedDecoding) throw firstErr;

        const fallbackId = makeStoryFbidEncoded(rawPostId);
        return await sendDelete(fallbackId);
      }
    } catch (err) {
      log.error("deletePost", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
