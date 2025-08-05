"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function logout() {
    const form_ = {
      pmid: "0"
    };

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/bluebar/modern_settings_menu/?help_type=364455653583099&show_contextual_help=1",
        ctx.jar,
        form_
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      const elem = resData.jsmods.instances[0][2][0].filter(function (v) {
        return v.value === "logout";
      })[0];

      const html = resData.jsmods.markup.filter(function (v) {
        return v[0] === elem.markup.__m;
      })[0][1].__html;

      const form = {
        fb_dtsg: utils.getFrom(html, '"fb_dtsg" value="', '"'),
        ref: utils.getFrom(html, '"ref" value="', '"'),
        h: utils.getFrom(html, '"h" value="', '"')
      };

      resData = await defaultFuncs.post(
        "https://www.facebook.com/logout.php",
        ctx.jar,
        form
      );
      await utils.saveCookies(ctx.jar)(resData);

      if (!resData.headers) {
        throw new utils.FcaError({
          error: "An error occurred when logging out."
        });
      }

      resData = await defaultFuncs.get(resData.headers.location, ctx.jar);
      await utils.saveCookies(ctx.jar)(resData);

      ctx.loggedIn = false;
      log.info("logout", "Logged out successfully.");
      return true;
    } catch (err) {
      log.error("logout", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
