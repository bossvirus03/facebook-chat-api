"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function getThreadPictures(threadID, offset, limit) {
    if (!utils.isOfType(threadID, ["Number", "String"])) {
      throw new utils.FcaError({
        error: `The first argument (threadID) must be a Number or String, not ${utils.getType(threadID)} (${threadID}).`
      });
    }
    threadID = String(threadID);

    let form = {
      thread_id: threadID,
      offset: offset,
      limit: limit
    };

    try {
      let resData = await defaultFuncs.post(
        "https://www.facebook.com/ajax/messaging/attachments/sharedphotos.php",
        ctx.jar,
        form
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (resData.error) {
        throw new utils.FcaError(resData);
      }

      const imagesData = resData.payload.imagesData;
      const imageData = [];
      const promises = imagesData.map(async (imageData) => {
        form = {
          thread_id: threadID,
          image_id: imageData.fbid
        };
        let resData2 = await defaultFuncs.post(
          "https://www.facebook.com/ajax/messaging/attachments/sharedphotos.php",
          ctx.jar,
          form
        );
        resData2 = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData2);

        if (resData2.error) {
          throw new utils.FcaError(resData2);
        }

        const queryThreadID =
          resData2.jsmods.require[0][3][1].query_metadata.query_path[0]
            .message_thread;
        const imageData2 =
          resData2.jsmods.require[0][3][1].query_results[queryThreadID]
            .message_images.edges[0].node.image2;
        imageData.push(imageData2);
      });

      await Promise.all(promises);

      return imageData;
    } catch (err) {
      log.error("getThreadPictures", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
