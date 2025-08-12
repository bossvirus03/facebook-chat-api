"use strict";

const utils = require("../utils");
const log = require("npmlog");

// Fetch profile timeline posts via GraphQL (CometManagePostsFeedRefetchQuery)
// Options mirrors key variables observed in the browser request and accepts sane defaults.
// Contract:
// - input: targetId (string | number), options?: { beforeTime?: number|null, afterTime?: number|null, count?: number, cursor?: string|null, taggedInOnly?: boolean, postedBy?: string|null }
// - output: raw parsed GraphQL JSON
// - errors: throws utils.FcaError on invalid args or GraphQL errors
module.exports = function(defaultFuncs, api, ctx) {
  return async function getProfilePosts(targetId, options) {
    try {
      if (!utils.isOfType(targetId, ["String", "Number"])) {
        throw new utils.FcaError({
          error: `The first argument (targetId) must be a String or Number, not ${utils.getType(
            targetId
          )} (${targetId}).`,
        });
      }
      options = options || {};

      const actorId = ctx.i_userID || ctx.userID;

      const variables = {
        afterTime: options.afterTime ?? null,
        beforeTime: options.beforeTime ?? null,
        count: options.count ?? 9,
        cursor: options.cursor ?? null,
        gridMediaWidth: 230,
        includeGroupScheduledPosts: false,
        includeScheduledPosts: null,
        omitPinnedPost: true,
        postedBy: options.postedBy ?? null,
        privacy: { exclusivity: "INCLUSIVE", filter: "ALL" },
        privacySelectorRenderLocation: "COMET_STREAM",
        renderLocation: "timeline",
        scale: 1,
        taggedInOnly: options.taggedInOnly ?? false,
        id: String(targetId),
        __relay_internal__pv__GHLShouldChangeSponsoredDataFieldNamerelayprovider: true,
      };

      const form = {
        av: actorId,
        __comet_req: 15,
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "CometManagePostsFeedRefetchQuery",
        doc_id: "24365332379820922",
        variables: JSON.stringify(variables),
        scale: 1,
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
    } catch (err) {
      log.error("getProfilePosts", err);
      if (err instanceof utils.FcaError) throw err;
      throw new utils.FcaError(err);
    }
  };
};
