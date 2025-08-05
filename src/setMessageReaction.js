"use strict";

const utils = require("../utils");
const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {
  return async function setMessageReaction(
    reaction,
    messageID,
    forceCustomReaction
  ) {
    if (ctx.i_userID) {
      throw new utils.FcaError({
        error: "Cannot set reaction as another profile."
      });
    }

    switch (reaction) {
      case "\uD83D\uDE0D": //:heart_eyes:
      case "\uD83D\uDE06": //:laughing:
      case "\uD83D\uDE2E": //:open_mouth:
      case "\uD83D\uDE22": //:cry:
      case "\uD83D\uDE20": //:angry:
      case "\uD83D\uDC4D": //:thumbsup:
      case "\uD83D\uDC4E": //:thumbsdown:
      case "\u2764": //:heart:
      case "\uD83D\uDC97": //:glowingheart:
      case "":
        //valid
        break;
      case ":heart_eyes:":
      case ":love:":
        reaction = "\uD83D\uDE0D";
        break;
      case ":laughing:":
      case ":haha:":
        reaction = "\uD83D\uDE06";
        break;
      case ":open_mouth:":
      case ":wow:":
        reaction = "\uD83D\uDE2E";
        break;
      case ":cry:":
      case ":sad:":
        reaction = "\uD83D\uDE22";
        break;
      case ":angry:":
        reaction = "\uD83D\uDE20";
        break;
      case ":thumbsup:":
      case ":like:":
        reaction = "\uD83D\uDC4D";
        break;
      case ":thumbsdown:":
      case ":dislike:":
        reaction = "\uD83D\uDC4E";
        break;
      case ":heart:":
        reaction = "\u2764";
        break;
      case ":glowingheart:":
        reaction = "\uD83D\uDC97";
        break;
      default:
        if (forceCustomReaction) {
          break;
        }
        throw new utils.FcaError({
          error: "Reaction is not a valid emoji."
        });
    }

    const variables = {
      data: {
        client_mutation_id: ctx.clientMutationId++,
        actor_id: ctx.i_userID || ctx.userID,
        action: reaction == "" ? "REMOVE_REACTION" : "ADD_REACTION",
        message_id: messageID,
        reaction: reaction
      }
    };

    const qs = {
      doc_id: "1491398900900362",
      variables: JSON.stringify(variables),
      dpr: 1
    };

    try {
      let resData = await defaultFuncs.postFormData(
        "https://www.facebook.com/webgraphql/mutation/",
        ctx.jar,
        {},
        qs
      );
      resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(resData);

      if (!resData) {
        throw new utils.FcaError({
          error: "setReaction returned empty object."
        });
      }

      if (resData.error || resData.errors) {
        throw new utils.FcaError(resData);
      }

      return true;
    } catch (err) {
      log.error("setMessageReaction", err);
      if (err instanceof utils.FcaError) {
        throw err;
      } else {
        throw new utils.FcaError(err);
      }
    }
  };
};
