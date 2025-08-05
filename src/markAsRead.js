"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function markAsRead(threadID, read) {
    if (!utils.isOfType(threadID, ["Number", "String"])) {
      throw new utils.FcaError({
        error: `The first argument (threadID) must be a Number or String, not ${utils.getType(threadID)} (${threadID}).`
      });
    }

    if (read == undefined) {
      read = true;
    }

    const form = {};

    if (typeof ctx.globalOptions.pageID !== "undefined") {
      form["source"] = "PagesManagerMessagesInterface";
      form["request_user_id"] = ctx.globalOptions.pageID;
      form[`ids[${threadID}]`] = read;
      form["watermarkTimestamp"] = new Date().getTime();
      form["shouldSendReadReceipt"] = true;
      form["commerce_last_message_type"] = "";
      //form["titanOriginatedThreadId"] = utils.generateThreadingID(ctx.clientID);

      try {
        let resData = await defaultFuncs.post(
          "https://www.facebook.com/ajax/mercury/change_read_status.php",
          ctx.jar,
          form
        );
        await utils.saveCookies(ctx.jar)(resData);
        resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

        if (resData.error || resData.errors) {
          throw new utils.FcaError(resData);
        }

        if (ctx.mqttClient) {
          const err = await new Promise((r) =>
            ctx.mqttClient.publish(
              "/mark_thread",
              JSON.stringify({
                threadID,
                mark: "read",
                state: read
              }),
              {
                qos: 1,
                retain: false
              },
              r
            )
          );

          if (err) {
            throw new utils.FcaError(err);
          }
        } else {
          throw new utils.FcaError({
            error: "You can only use this function after you start listening."
          });
        }
      } catch (err) {
        log.error("markAsRead", err);
        if (utils.getType(err) == "Object" && err.error === "Not logged in.") {
          ctx.loggedIn = false;
        }
        if (err instanceof utils.FcaError) {
          throw err;
        } else {
          throw new utils.FcaError(err);
        }
      }
    }
  };
};
