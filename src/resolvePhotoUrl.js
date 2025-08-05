"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function resolvePhotoUrl(photoID) {
    if (!utils.isOfType(photoID, ["Number", "String"])) {
      throw new utils.FcaError({
        error: `The first argument (photoID) must be a Number or String, not ${utils.getType(photoID)} (${photoID}).`
      });
    }
    photoID = String(photoID);

    try {
      let resData = await defaultFuncs.get(
        "https://www.facebook.com/mercury/attachments/photo",
        ctx.jar,
        {
          photo_id: photoID
        }
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return resData.jsmods.require[0][3][0];
    } catch (err) {
      log.error("resolvePhotoUrl", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
