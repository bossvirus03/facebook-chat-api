"use strict";

const utils = require("../utils");
const log = require("npmlog");

function formatData(arr) {
  return arr.map(function (user) {
    const node = user.node;
    return {
      fullName: node.name,
      firstName: node.short_name,
      gender: node.gender,
      userID: node.id,
      isFriend: node.friendship_status == "ARE_FRIENDS",
      profilePicture: node.profile_picture,
      type: node.__typename,
      profileUrl: node.url,
      vanity: node.url.includes("id=")
        ? null
        : node.url.replace("https://www.facebook.com/", ""),
      commonFriends: Number(node.social_context.text.match(/(\d+)/g)[0])
    };
  });
}

module.exports = function (defaultFuncs, api, ctx) {
  return async function getFriendsList(limit, cursor) {
    if (utils.getType(limit) === "Number" && (limit <= 0 || limit > 30)) {
      throw new utils.FcaError({
        error: "Limit should be a positive number and less than or equal to 30."
      });
    }

    const form = {
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "FriendingCometFriendsListPaginationQuery",
      variables: {
        count: limit,
        name: null
      },
      server_timestamps: "true",
      doc_id: "4854590387990555"
    };
    if (cursor) {
      form.variables.cursor = cursor;
    }
    form.variables = JSON.stringify(form.variables);

    try {
      const resData = await defaultFuncs.postFormData(
        "https://www.facebook.com/api/graphql",
        ctx.jar,
        form
      );

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return formatData(resData.data.viewer.all_friends.edges);
    } catch (err) {
      log.error("getFriendsList", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
