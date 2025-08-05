"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  /**
   * Refreshes the fb_dtsg and jazoest values.
   * @param {Function} callback
   * @returns {Promise}
   * @description if you don't update the value of fb_dtsg and jazoest for a long time an error "Please try closing and re-opening your browser window" will appear
   * @description you should refresh it every 48h or less
   */
  return async function refreshFb_dtsg(obj) {
    if (!obj) {
      obj = {};
    }

    if (utils.getType(obj) !== "Object") {
      throw new utils.FcaError({
        error: "The first parameter must be an object or a callback function"
      });
    }

    try {
      const resData = await utils.get(
        "https://m.facebook.com/",
        ctx.jar,
        null,
        ctx.globalOptions,
        { noRef: true }
      );
      const html = resData.body;
      const fb_dtsg = utils.getFrom(html, 'name="fb_dtsg" value="', '"');
      const jazoest = utils.getFrom(html, 'name="jazoest" value="', '"');
      if (!fb_dtsg) {
        throw new utils.FcaError({
          error:
            "Could not find fb_dtsg in HTML after requesting https://www.facebook.com/"
        });
      }
      ctx.fb_dtsg = fb_dtsg;
      ctx.jazoest = jazoest;
      return {
        data: {
          fb_dtsg: fb_dtsg,
          jazoest: jazoest
        },
        message: "refreshed fb_dtsg and jazoest values successfully"
      };
    } catch (err) {
      log.error("refreshFb_dtsg", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
