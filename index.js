"use strict";

const utils = require("./utils");
const log = require("npmlog");

const checkVerified = null;

const defaultLogRecordSize = 100;
log.maxRecordSize = defaultLogRecordSize;

function setOptions(globalOptions, options) {
  Object.keys(options).map(function(key) {
    switch (key) {
      case "pauseLog":
        if (options.pauseLog) {
          log.pause();
        }
        break;
      case "online":
        globalOptions.online = Boolean(options.online);
        break;
      case "logLevel":
        log.level = options.logLevel;
        globalOptions.logLevel = options.logLevel;
        break;
      case "logRecordSize":
        log.maxRecordSize = options.logRecordSize;
        globalOptions.logRecordSize = options.logRecordSize;
        break;
      case "selfListen":
        globalOptions.selfListen = Boolean(options.selfListen);
        break;
      case "selfListenEvent":
        globalOptions.selfListenEvent = options.selfListenEvent;
        break;
      case "listenEvents":
        globalOptions.listenEvents = Boolean(options.listenEvents);
        break;
      case "pageID":
        globalOptions.pageID = options.pageID.toString();
        break;
      case "updatePresence":
        globalOptions.updatePresence = Boolean(options.updatePresence);
        break;
      case "forceLogin":
        globalOptions.forceLogin = Boolean(options.forceLogin);
        break;
      case "userAgent":
        globalOptions.userAgent = options.userAgent;
        break;
      case "autoMarkDelivery":
        globalOptions.autoMarkDelivery = Boolean(options.autoMarkDelivery);
        break;
      case "autoMarkRead":
        globalOptions.autoMarkRead = Boolean(options.autoMarkRead);
        break;
      case "listenTyping":
        globalOptions.listenTyping = Boolean(options.listenTyping);
        break;
      case "proxy":
        if (typeof options.proxy != "string") {
          delete globalOptions.proxy;
          utils.setProxy();
        } else {
          globalOptions.proxy = options.proxy;
          utils.setProxy(globalOptions.proxy);
        }
        break;
      case "autoReconnect":
        globalOptions.autoReconnect = Boolean(options.autoReconnect);
        break;
      case "emitReady":
        globalOptions.emitReady = Boolean(options.emitReady);
        break;
      case "wsCallbackTimeout":
        globalOptions.wsCallbackTimeout = options.wsCallbackTimeout;
        break;
      default:
        log.warn(
          "setOptions",
          "Unrecognized option given to setOptions: " + key
        );
        break;
    }
  });
}

let ctx = null;
let _defaultFuncs = null;
let api = null;

function buildAPI(globalOptions, html, jar) {
  const maybeCookie = jar
    .getCookies("https://www.facebook.com")
    .filter(function(val) {
      return val.cookieString().split("=")[0] === "c_user";
    });

  const objCookie = jar
    .getCookies("https://www.facebook.com")
    .reduce(function(obj, val) {
      obj[val.cookieString().split("=")[0]] = val.cookieString().split("=")[1];
      return obj;
    }, {});

  if (maybeCookie.length === 0) {
    throw new utils.FcaError({
      error:
        "Error retrieving userID. This can be caused by a lot of things, including getting blocked by Facebook for logging in from an unknown location. Try logging in with a browser to verify.",
    });
  }

  if (html.indexOf("/checkpoint/block/?next") > -1) {
    log.warn(
      "login",
      "Checkpoint detected. Please log in with a browser to verify."
    );
  }

  const userID = maybeCookie[0]
    .cookieString()
    .split("=")[1]
    .toString();
  const i_userID = objCookie.i_user || null; // i_userID is id of account created by parent account (if it's a child account)
  log.info("login", `Logged in as ${userID}`);

  try {
    clearInterval(checkVerified);
  } catch (_) {}

  const clientID = ((Math.random() * 2147483648) | 0).toString(16);

  const { mqttEndpoint, region, irisSeqID, noMqttData } = utils.getIrisMQTTData(
    html
  );

  // All data available to api functions
  const ctx = {
    userID: userID,
    i_userID: i_userID,
    jar: jar,
    clientID: clientID,
    globalOptions: globalOptions,
    loggedIn: true,
    access_token: null,
    clientMutationId: 0,
    mqttClient: undefined,
    lastSeqId: irisSeqID,
    syncToken: undefined,
    wsReqNumber: 0,
    wsTaskNumber: 0,
    wsCallbacks: new Map(),
    mqttEndpoint,
    region,
    firstListen: true,
  };

  // modify method set in wsCallbacks (easy to debug)
  const defaultSet = ctx.wsCallbacks.set;
  ctx.wsCallbacks.set = function(key, value) {
    if (!value?.stackTrace) {
      value.stackTrace = new utils.FcaError("Error stack trace");
    }
    return defaultSet.call(ctx.wsCallbacks, key, value);
  };

  const api = {
    setOptions: setOptions.bind(null, globalOptions),
    getAppState: function getAppState() {
      const appState = utils.getAppState(jar);
      // filter duplicate
      return appState.filter(
        (item, index, self) =>
          self.findIndex((t) => {
            return t.key === item.key;
          }) === index
      );
    },
  };

  if (noMqttData) {
    api["htmlData"] = noMqttData;
  }

  const apiFuncNames = [
    "addExternalModule",
    "addUserToGroup",
    "acceptFriendRequest",
    "getProfilePosts",
    "changeAdminStatus",
    "changeArchivedStatus",
    "changeAvatar",
    "changeBio",
    "changeBlockedStatus",
    "changeGroupImage",
    "changeNickname",
    "changeThreadColor",
    "changeThreadEmoji",
    "createNewGroup",
    "createPoll",
    "deleteMessage",
    "deletePost",
    "deleteThread",
    "forwardAttachment",
    "getCurrentUserID",
    "getEmojiUrl",
    "getFriendsList",
    "getMessage",
    "getThreadHistory",
    "getThreadInfo",
    "getThreadList",
    "getThreadPictures",
    "getTotalNumberFriends",
    "getUserID",
    "getUserInfo",
    "handleMessageRequest",
    "listenMqtt",
    "logout",
    "markAsDelivered",
    "markAsRead",
    "markAsReadAll",
    "markAsSeen",
    "muteThread",
    "refreshFb_dtsg",
    "removeUserFromGroup",
    "resolvePhotoUrl",
    "searchForThread",
    "sendMessage",
    "sendMessageMqtt",
    "sendTypingIndicator",
    "setMessageReaction",
    "setPostReaction",
    "setThreadName",
    "shareContact",
    "threadColors",
    "unsendMessage",
    "unfriend",
    "uploadStory",
    "editMessage",

    // HTTP
    "httpGet",
    "httpPost",
    "httpPostFormData",

    "uploadAttachment",
  ];

  const defaultFuncs = utils.makeDefaults(html, i_userID || userID, ctx);

  // Load all api functions in a loop
  apiFuncNames.map(function(v) {
    api[v] = require("./src/" + v)(defaultFuncs, api, ctx);
  });

  return [ctx, defaultFuncs, api];
}

// Helps the login
function loginHelper(
  appState,
  email,
  password,
  globalOptions,
  callback,
  prCallback
) {
  let mainPromise = null;
  const jar = utils.getJar();

  // If we're given an appState we loop through it and save each cookie
  // back into the jar.
  if (appState) {
    // check and convert cookie to appState
    if (utils.getType(appState) === "Array" && appState.some((c) => c.name)) {
      appState = appState.map((c) => {
        c.key = c.name;
        delete c.name;
        return c;
      });
    } else if (utils.getType(appState) === "String") {
      const arrayAppState = [];
      appState.split(";").forEach((c) => {
        const [key, value] = c.split("=");

        arrayAppState.push({
          key: (key || "").trim(),
          value: (value || "").trim(),
          domain: "facebook.com",
          path: "/",
          expires: new Date().getTime() + 1000 * 60 * 60 * 24 * 365,
        });
      });
      appState = arrayAppState;
    }

    appState.map(function(c) {
      const str =
        c.key +
        "=" +
        c.value +
        "; expires=" +
        c.expires +
        "; domain=" +
        c.domain +
        "; path=" +
        c.path +
        ";";
      jar.setCookie(str, "http://" + c.domain);
    });

    // Load the main page.
    mainPromise = utils
      .get("https://www.facebook.com/", jar, null, globalOptions, {
        noRef: true,
      })
      .then(utils.saveCookies(jar));
  } else {
    if (email) {
      throw new utils.FcaError({
        error:
          "Currently, the login method by email and password is no longer supported, please use the login method by appState",
      });
    } else {
      throw new utils.FcaError({
        error: "No appState or email and password provided",
      });
    }
  }

  mainPromise
    .then(function(res) {
      // Hacky check for the redirection that happens on some ISPs, which doesn't return statusCode 3xx
      const reg = /<meta http-equiv="refresh" content="0;url=([^"]+)[^>]+>/;
      const redirect = reg.exec(res.body);
      if (redirect && redirect[1]) {
        return utils
          .get(redirect[1], jar, null, globalOptions)
          .then(utils.saveCookies(jar));
      }
      return res;
    })
    .then(function(res) {
      const html = res.body;
      const stuff = buildAPI(globalOptions, html, jar);
      ctx = stuff[0];
      _defaultFuncs = stuff[1];
      api = stuff[2];
      return res;
    })
    .then(function() {
      return utils.checkLiveCookie(ctx, _defaultFuncs);
    })
    .then(function() {
      log.info("login", "Done logging in.");
      return callback(null, api);
    })
    .catch(function(e) {
      log.error("login", e.error || e);
      callback(e);
    });
}

function login(loginData, options, callback) {
  if (
    utils.getType(options) === "Function" ||
    utils.getType(options) === "AsyncFunction"
  ) {
    callback = options;
    options = {};
  }

  const globalOptions = {
    selfListen: false,
    selfListenEvent: false,
    listenEvents: false,
    listenTyping: false,
    updatePresence: false,
    forceLogin: false,
    autoMarkDelivery: true,
    autoMarkRead: false,
    autoReconnect: true,
    logRecordSize: defaultLogRecordSize,
    online: true,
    emitReady: false,
    wsCallbackTimeout: 60 * 1000, // the default timeout for waiting for a callback to be called
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  };

  setOptions(globalOptions, options);

  let prCallback = null;
  let returnPromise;

  if (
    utils.getType(callback) !== "Function" &&
    utils.getType(callback) !== "AsyncFunction"
  ) {
    let rejectFunc = null;
    let resolveFunc = null;
    returnPromise = new Promise(function(resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });
    prCallback = function(error, api) {
      if (error) {
        return rejectFunc(error);
      }
      return resolveFunc(api);
    };
    callback = prCallback;
  }

  loginHelper(
    loginData.appState,
    loginData.email,
    loginData.password,
    globalOptions,
    callback,
    prCallback
  );
  return returnPromise;
}

async function loginAsync(loginData, options) {
  return new Promise((resolve, reject) => {
    login(loginData, options, (error, api) => {
      if (error) {
        return reject(error);
      }
      return resolve(api);
    });
  });
}

module.exports = {
  login: login,
  loginAsync: loginAsync,
};
