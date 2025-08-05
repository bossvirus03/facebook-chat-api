"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  async function handleUpload(image) {
    const form = {
      profile_id: ctx.i_userID || ctx.userID,
      photo_source: 57,
      av: ctx.i_userID || ctx.userID,
      file: image
    };

    try {
      let resData = await defaultFuncs.postFormData(
        "https://www.facebook.com/profile/picture/upload/",
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

  return async function changeAvatar(
    image,
    caption = "",
    timestampExpiry = null
  ) {
    if (!timestampExpiry && utils.getType(caption) === "Number") {
      timestampExpiry = caption;
      caption = "";
    }

    if (!utils.isReadableStream(image)) {
      throw new utils.FcaError(
        `The first argument (image) must be a ReadableStream, not ${utils.getType(image)} (${image}).`
      );
    }

    try {
      const payload = await handleUpload(image);

      const form = {
        av: ctx.i_userID || ctx.userID,
        fb_api_req_friendly_name: "ProfileCometProfilePictureSetMutation",
        fb_api_caller_class: "RelayModern",
        doc_id: "5066134240065849",
        variables: JSON.stringify({
          input: {
            caption,
            existing_photo_id: payload.payload.fbid,
            expiration_time: timestampExpiry,
            profile_id: ctx.i_userID || ctx.userID,
            profile_pic_method: "EXISTING",
            profile_pic_source: "TIMELINE",
            scaled_crop_rect: {
              height: 1,
              width: 1,
              x: 0,
              y: 0
            },
            skip_cropping: true,
            actor_id: ctx.i_userID || ctx.userID,
            client_mutation_id: Math.round(Math.random() * 19).toString()
          },
          isPage: false,
          isProfile: true,
          scale: 3
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

      return resData[0].data.profile_picture_set;
    } catch (err) {
      log.error("changeAvatar", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
