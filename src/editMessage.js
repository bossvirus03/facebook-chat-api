"use strict";

const utils = require("../utils");

module.exports = function (defaultFuncs, api, ctx) {
	return function editMessage(messageID, newContent) {
		if (!ctx.mqttClient) {
			throw new Error("Not connected to MQTT");
		}

		ctx.wsReqNumber += 1;
		ctx.wsTaskNumber += 1;

		const taskPayload = {
			message_id: messageID,
			text: newContent
		};

		const task = {
			failure_count: null,
			label: "742",
			payload: JSON.stringify(taskPayload),
			queue_name: "edit_message",
			task_id: ctx.wsTaskNumber
		};

		const content = {
			app_id: "2220391788200892",
			payload: {
				data_trace_id: null,
				epoch_id: parseInt(utils.generateOfflineThreadingID()),
				tasks: [],
				version_id: "6903494529735864"
			},
			request_id: ctx.wsReqNumber,
			type: 3
		};

		content.payload.tasks.push(task);
		content.payload = JSON.stringify(content.payload);

		return new Promise((resolve, reject) => {
			ctx.wsCallbacks.set(ctx.wsReqNumbe, {
				type: "edit_message",
				cb: (err, data) => {
					if (err) return reject(err);
					resolve(data);
				}
			});

			ctx.mqttClient.publish("/ls_req", JSON.stringify(content), {
				qos: 1,
				retain: false
			});
		});
	};
};
