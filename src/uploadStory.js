"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  async function handleUpload(image) {
    const form = {
      source: 8,
      profile_id: ctx.i_userID || ctx.userID,
      waterfallxapp: "comet_stories",
      farr: image,
      upload_id: "jsc_c_21"
    };

    try {
      let resData = await defaultFuncs.postFormData(
        "https://upload.facebook.com/ajax/react_composer/attachments/photo/upload?av=" +
          (ctx.i_userID || ctx.userID) +
          "&__aaid=0&__user=" +
          (ctx.i_userID || ctx.userID),
        ctx.jar,
        form,
        {}
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      return resData;
    } catch (err) {
      log.error("handleUpload", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  }

  return async function uploadStory(image) {
    try {
      const payload = await handleUpload(image);
      const form = {
        av: ctx.i_userID || ctx.userID,
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "StoriesCreateMutation",
        doc_id: "6197602830367217",
        server_timestamps: true,
        variables: JSON.stringify({
          input: {
            audiences: [
              {
                stories: {
                  self: {
                    target_id: "100000896757547"
                  }
                }
              }
            ],
            audiences_is_complete: true,
            logging: {
              composer_session_id: utils.getGUID()
            },
            navigation_data: {
              attribution_id_v2:
                "StoriesCreateRoot.react,comet.stories.create,unexpected," +
                Date.now() +
                ",697081,,,;CometHomeRoot.react,comet.home,logo," +
                Date.now() +
                ",20204,4748854339,,"
            },
            source: "WWW",
            attachments: [
              {
                photo: {
                  id: payload.payload.photoID,
                  overlays: null
                }
              }
            ],
            tracking: [null],
            actor_id: ctx.i_userID || ctx.userID,
            client_mutation_id: "5"
          }
        })
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

      return true;
    } catch (err) {
      log.error("uploadStory", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
