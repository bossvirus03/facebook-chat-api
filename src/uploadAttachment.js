const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  async function upload(attachments) {
    const uploads = [];

    // create an array of promises
    for (let i = 0; i < attachments.length; i++) {
      if (!utils.isReadableStream(attachments[i])) {
        throw new utils.FcaError({
          error: `Attachment should be a readable stream and not ${utils.getType(attachments[i])}.`
        });
      }

      const form = {
        upload_1024: attachments[i],
        voice_clip: "true"
      };

      uploads.push(
        defaultFuncs
          .postFormData(
            "https://upload.facebook.com/ajax/mercury/upload.php",
            ctx.jar,
            form,
            {}
          )
          .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
          .then(function (resData) {
            if (resData.error) {
              throw resData;
            }

            // We have to return the data unformatted unless we want to change it
            // back in sendMessage.
            return resData.payload.metadata[0];
          })
      );
    }

    // resolve all promises
    try {
      const resData = await Promise.all(uploads);
      return resData;
    } catch (err) {
      log.error("uploadAttachment", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  }

  return async function uploadAttachment(attachments) {
    if (
      !attachments &&
      !utils.isReadableStream(attachments) &&
      !utils.getType(attachments) === "Array" &&
      utils.getType(attachments) === "Array" &&
      !attachments.length
    ) {
      throw new utils.FcaError(
        "Please pass an attachment or an array of attachments."
      );
    }

    if (utils.getType(attachments) !== "Array") {
      attachments = [attachments];
    }

    try {
      const resData = await upload(attachments);
      return resData;
    } catch (err) {
      log.error("uploadAttachment", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
