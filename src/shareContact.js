"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function shareContact(text, senderID, threadID) {
    if (!ctx.mqttClient) {
      throw new utils.FcaError("Please connect to MQTT to use this feature");
    }

    return new Promise((resolve, reject) => {
      const requestId = ++ctx.wsReqNumber;
      const taskId = ++ctx.wsTaskNumber;

      const form = {
        app_id: "2220391788200892",
        payload: JSON.stringify({
          tasks: [
            {
              label: "359",
              payload: JSON.stringify({
                contact_id: senderID,
                sync_group: 1,
                text: text || "",
                thread_id: threadID
              }),
              queue_name: "messenger_contact_sharing",
              task_id: taskId,
              failure_count: null
            }
          ],
          epoch_id: parseInt(utils.generateOfflineThreadingID()),
          version_id: "7214102258676893"
        }),
        request_id: requestId,
        type: 3
      };

      const stackTrace = new utils.FcaError();
      ctx.wsCallbacks.set(requestId, {
        stackTrace: stackTrace,
        type: "messenger_contact_sharing",
        cb: (error, data) => {
          if (
            data.response.payload.step[1]?.[2]?.[2]?.[1]?.[1] &&
            data.response.payload.step[1]?.[2]?.[2]?.[1]?.[2]
          ) {
            stackTrace.error = data.response.payload.step[1][2][2][1][1];

            log.error("shareContact", stackTrace);
            reject(stackTrace);
          } else if (error) {
            for (const key in error) {
              stackTrace[key] = error[key];
            }
            log.error("shareContact", error);
            reject(error);
          } else {
            resolve(data);
          }
        },
        timeout: setTimeout(() => {
          stackTrace.error = `shareContact request timed out after ${ctx.globalOptions.wsCallbackTimeout}ms`;
          reject(stackTrace);
        }, ctx.globalOptions.wsCallbackTimeout)
      });

      ctx.mqttClient.publish("/ls_req", JSON.stringify(form), {
        qos: 1,
        retain: false
      });
    });
  };
};
