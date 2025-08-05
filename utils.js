"use strict";

let request = promisifyPromise(
	require("request").defaults({ jar: true, proxy: process.env.FB_PROXY })
);
const stream = require("stream");
const log = require("npmlog");
const querystring = require("querystring");
const url = require("url");

class FcaError extends Error {
	constructor(obj) {
		if (!obj) {
			obj = {};
		} else if (typeof obj === "string") {
			obj = { message: obj };
		}
		if (typeof obj !== "object" || obj === null) {
			throw new TypeError("Object required");
		}
		obj.message ? super(obj.message) : super();
		Object.assign(this, obj);
	}
}

function callbackToPromise(func) {
	return function (...args) {
		return new Promise((resolve, reject) => {
			func(...args, (err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			});
		});
	};
}

function isHasCallback(func) {
	if (typeof func !== "function") {
		return false;
	}
	return (
		func
			.toString()
			.split("\n")[0]
			.match(/(callback|cb)\s*\)/) !== null
	);
}

// replace for bluebird.promisify (but this only applies best to the `request` package)
function promisifyPromise(promise) {
	const keys = Object.keys(promise);
	let promise_;
	if (typeof promise === "function" && isHasCallback(promise)) {
		promise_ = callbackToPromise(promise);
	} else {
		promise_ = promise;
	}

	for (const key of keys) {
		if (!promise[key]?.toString) {
			continue;
		}

		if (typeof promise[key] === "function" && isHasCallback(promise[key])) {
			promise_[key] = callbackToPromise(promise[key]);
		} else {
			promise_[key] = promise[key];
		}
	}

	return promise_;
}

// replace for bluebird.delay
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// replace for bluebird.try
function tryPromise(tryFunc) {
	return new Promise((resolve, reject) => {
		try {
			resolve(tryFunc());
		} catch (error) {
			reject(error);
		}
	});
}

function setProxy(url) {
	if (typeof url == "undefined") {
		return (request = promisifyPromise(
			require("request").defaults({
				jar: true
			})
		));
	}
	return (request = promisifyPromise(
		require("request").defaults({
			jar: true,
			proxy: url
		})
	));
}

function getHeaders(url, options, ctx, customHeader) {
	const headers = {
		"Content-Type": "application/x-www-form-urlencoded",
		Referer: "https://www.facebook.com/",
		Host: url.replace("https://", "").split("/")[0],
		Origin: "https://www.facebook.com",
		"User-Agent": options.userAgent,
		Connection: "keep-alive",
		"sec-fetch-site": "same-origin"
	};
	if (customHeader) {
		Object.assign(headers, customHeader);
	}
	if (ctx && ctx.region) {
		headers["X-MSGR-Region"] = ctx.region;
	}

	return headers;
}

function isReadableStream(obj) {
	return (
		obj instanceof stream.Stream &&
		(getType(obj._read) === "Function" ||
			getType(obj._read) === "AsyncFunction") &&
		getType(obj._readableState) === "Object"
	);
}

function get(url, jar, qs, options, ctx) {
	// I'm still confused about this
	if (getType(qs) === "Object") {
		for (const prop in qs) {
			if (qs.hasOwnProperty(prop) && getType(qs[prop]) === "Object") {
				qs[prop] = JSON.stringify(qs[prop]);
			}
		}
	}
	const op = {
		headers: getHeaders(url, options, ctx),
		timeout: 60000,
		qs: qs,
		url: url,
		method: "GET",
		jar: jar,
		gzip: true
	};

	return request(op).then(function (res) {
		return Array.isArray(res) ? res[0] : res;
	});
}

function post(url, jar, form, options, ctx, customHeader) {
	const op = {
		headers: getHeaders(url, options, ctx, customHeader),
		timeout: 60000,
		url: url,
		method: "POST",
		form: form,
		jar: jar,
		gzip: true
	};

	return request(op).then(function (res) {
		return Array.isArray(res) ? res[0] : res;
	});
}

function postFormData(url, jar, form, qs, options, ctx) {
	const headers = getHeaders(url, options, ctx);
	headers["Content-Type"] = "multipart/form-data";
	const op = {
		headers: headers,
		timeout: 60000,
		url: url,
		method: "POST",
		formData: form,
		qs: qs,
		jar: jar,
		gzip: true
	};

	return request(op).then(function (res) {
		return Array.isArray(res) ? res[0] : res;
	});
}

function padZeros(val, len) {
	val = String(val);
	len = len || 2;
	while (val.length < len) {
		val = "0" + val;
	}
	return val;
}

function generateThreadingID(clientID) {
	const k = Date.now();
	const l = Math.floor(Math.random() * 4294967295);
	const m = clientID;
	return "<" + k + ":" + l + "-" + m + "@mail.projektitan.com>";
}

function binaryToDecimal(data) {
	let ret = "";
	while (data !== "0") {
		let end = 0;
		let fullName = "";
		let i = 0;
		for (; i < data.length; i++) {
			end = 2 * end + parseInt(data[i], 10);
			if (end >= 10) {
				fullName += "1";
				end -= 10;
			} else {
				fullName += "0";
			}
		}
		ret = end.toString() + ret;
		data = fullName.slice(fullName.indexOf("1"));
	}
	return ret;
}

function generateOfflineThreadingID() {
	const ret = Date.now();
	const value = Math.floor(Math.random() * 4294967295);
	const str = ("0000000000000000000000" + value.toString(2)).slice(-22);
	const msgs = ret.toString(2) + str;
	return binaryToDecimal(msgs);
}

let h;
const i = {};
const j = {
	_: "%",
	A: "%2",
	B: "000",
	C: "%7d",
	D: "%7b%22",
	E: "%2c%22",
	F: "%22%3a",
	G: "%2c%22ut%22%3a1",
	H: "%2c%22bls%22%3a",
	I: "%2c%22n%22%3a%22%",
	J: "%22%3a%7b%22i%22%3a0%7d",
	K: "%2c%22pt%22%3a0%2c%22vis%22%3a",
	L: "%2c%22ch%22%3a%7b%22h%22%3a%22",
	M: "%7b%22v%22%3a2%2c%22time%22%3a1",
	N: ".channel%22%2c%22sub%22%3a%5b",
	O: "%2c%22sb%22%3a1%2c%22t%22%3a%5b",
	P: "%2c%22ud%22%3a100%2c%22lc%22%3a0",
	Q: "%5d%2c%22f%22%3anull%2c%22uct%22%3a",
	R: ".channel%22%2c%22sub%22%3a%5b1%5d",
	S: "%22%2c%22m%22%3a0%7d%2c%7b%22i%22%3a",
	T: "%2c%22blc%22%3a1%2c%22snd%22%3a1%2c%22ct%22%3a",
	U: "%2c%22blc%22%3a0%2c%22snd%22%3a1%2c%22ct%22%3a",
	V: "%2c%22blc%22%3a0%2c%22snd%22%3a0%2c%22ct%22%3a",
	W: "%2c%22s%22%3a0%2c%22blo%22%3a0%7d%2c%22bl%22%3a%7b%22ac%22%3a",
	X: "%2c%22ri%22%3a0%7d%2c%22state%22%3a%7b%22p%22%3a0%2c%22ut%22%3a1",
	Y: "%2c%22pt%22%3a0%2c%22vis%22%3a1%2c%22bls%22%3a0%2c%22blc%22%3a0%2c%22snd%22%3a1%2c%22ct%22%3a",
	Z: "%2c%22sb%22%3a1%2c%22t%22%3a%5b%5d%2c%22f%22%3anull%2c%22uct%22%3a0%2c%22s%22%3a0%2c%22blo%22%3a0%7d%2c%22bl%22%3a%7b%22ac%22%3a"
};
(function () {
	const l = [];
	for (const m in j) {
		i[j[m]] = m;
		l.push(j[m]);
	}
	l.reverse();
	h = new RegExp(l.join("|"), "g");
})();

function presenceEncode(str) {
	return encodeURIComponent(str)
		.replace(/([_A-Z])|%../g, function (m, n) {
			return n ? "%" + n.charCodeAt(0).toString(16) : m;
		})
		.toLowerCase()
		.replace(h, function (m) {
			return i[m];
		});
}

// eslint-disable-next-line no-unused-vars
function presenceDecode(str) {
	return decodeURIComponent(
		str.replace(/[_A-Z]/g, function (m) {
			return j[m];
		})
	);
}

function generatePresence(userID) {
	const time = Date.now();
	return (
		"E" +
		presenceEncode(
			JSON.stringify({
				v: 3,
				time: parseInt(time / 1000, 10),
				user: userID,
				state: {
					ut: 0,
					t2: [],
					lm2: null,
					uct2: time,
					tr: null,
					tw: Math.floor(Math.random() * 4294967295) + 1,
					at: time
				},
				ch: {
					["p_" + userID]: 0
				}
			})
		)
	);
}

function generateAccessiblityCookie() {
	const time = Date.now();
	return encodeURIComponent(
		JSON.stringify({
			sr: 0,
			"sr-ts": time,
			jk: 0,
			"jk-ts": time,
			kb: 0,
			"kb-ts": time,
			hcm: 0,
			"hcm-ts": time
		})
	);
}

function getGUID() {
	/** @type {number} */
	let sectionLength = Date.now();
	/** @type {string} */
	const id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
		/[xy]/g,
		function (c) {
			/** @type {number} */
			const r = Math.floor((sectionLength + Math.random() * 16) % 16);
			/** @type {number} */
			sectionLength = Math.floor(sectionLength / 16);
			/** @type {string} */
			const _guid = (c == "x" ? r : (r & 7) | 8).toString(16);
			return _guid;
		}
	);
	return id;
}

function getExtension(original_extension, fullFileName = "") {
	if (original_extension) {
		return original_extension;
	} else {
		const extension = fullFileName.split(".").pop();
		if (extension === fullFileName) {
			return "";
		} else {
			return extension;
		}
	}
}

function _formatAttachment(attachment1, attachment2) {
	// TODO: THIS IS REALLY BAD
	// This is an attempt at fixing Facebook's inconsistencies. Sometimes they give us
	// two attachment objects, but sometimes only one. They each contain part of the
	// data that you'd want so we merge them for convenience.
	// Instead of having a bunch of if statements guarding every access to image_data,
	// we set it to empty object and use the fact that it'll return undefined.
	const fullFileName = attachment1.filename;
	const fileSize = Number(attachment1.fileSize || 0);
	const durationVideo = attachment1.genericMetadata
		? Number(attachment1.genericMetadata.videoLength)
		: undefined;
	const durationAudio = attachment1.genericMetadata
		? Number(attachment1.genericMetadata.duration)
		: undefined;
	const mimeType = attachment1.mimeType;

	attachment2 = attachment2 || { id: "", image_data: {} };
	attachment1 = attachment1.mercury || attachment1;
	let blob = attachment1.blob_attachment || attachment1.sticker_attachment;
	let type =
		blob && blob.__typename ? blob.__typename : attachment1.attach_type;
	if (!type && attachment1.sticker_attachment) {
		type = "StickerAttachment";
		blob = attachment1.sticker_attachment;
	} else if (!type && attachment1.extensible_attachment) {
		if (
			attachment1.extensible_attachment.story_attachment &&
			attachment1.extensible_attachment.story_attachment.target &&
			attachment1.extensible_attachment.story_attachment.target.__typename &&
			attachment1.extensible_attachment.story_attachment.target.__typename ===
				"MessageLocation"
		) {
			type = "MessageLocation";
		} else {
			type = "ExtensibleAttachment";
		}

		blob = attachment1.extensible_attachment;
	}
	// TODO: Determine whether "sticker", "photo", "file" etc are still used
	// KEEP IN SYNC WITH getThreadHistory
	switch (type) {
		case "sticker": {
			return {
				type: "sticker",
				ID: attachment1.metadata.stickerID.toString(),
				url: attachment1.url,

				packID: attachment1.metadata.packID.toString(),
				spriteUrl: attachment1.metadata.spriteURI,
				spriteUrl2x: attachment1.metadata.spriteURI2x,
				width: attachment1.metadata.width,
				height: attachment1.metadata.height,

				caption: attachment2.caption,
				description: attachment2.description,

				frameCount: attachment1.metadata.frameCount,
				frameRate: attachment1.metadata.frameRate,
				framesPerRow: attachment1.metadata.framesPerRow,
				framesPerCol: attachment1.metadata.framesPerCol,

				stickerID: attachment1.metadata.stickerID.toString(), // @Legacy
				spriteURI: attachment1.metadata.spriteURI, // @Legacy
				spriteURI2x: attachment1.metadata.spriteURI2x // @Legacy
			};
		}
		case "file": {
			return {
				type: "file",
				ID: attachment2.id.toString(),
				fullFileName: fullFileName,
				filename: attachment1.name,
				fileSize: fileSize,
				original_extension: getExtension(
					attachment1.original_extension,
					fullFileName
				),
				mimeType: mimeType,
				url: attachment1.url,

				isMalicious: attachment2.is_malicious,
				contentType: attachment2.mime_type,

				name: attachment1.name // @Legacy
			};
		}
		case "photo": {
			return {
				type: "photo",
				ID: attachment1.metadata.fbid.toString(),
				filename: attachment1.fileName,
				fullFileName: fullFileName,
				fileSize: fileSize,
				original_extension: getExtension(
					attachment1.original_extension,
					fullFileName
				),
				mimeType: mimeType,
				thumbnailUrl: attachment1.thumbnail_url,

				previewUrl: attachment1.preview_url,
				previewWidth: attachment1.preview_width,
				previewHeight: attachment1.preview_height,

				largePreviewUrl: attachment1.large_preview_url,
				largePreviewWidth: attachment1.large_preview_width,
				largePreviewHeight: attachment1.large_preview_height,

				url: attachment1.metadata.url, // @Legacy
				width: attachment1.metadata.dimensions.split(",")[0], // @Legacy
				height: attachment1.metadata.dimensions.split(",")[1], // @Legacy
				name: fullFileName // @Legacy
			};
		}
		case "animated_image": {
			return {
				type: "animated_image",
				ID: attachment2.id.toString(),
				filename: attachment2.filename,
				fullFileName: fullFileName,
				original_extension: getExtension(
					attachment2.original_extension,
					fullFileName
				),
				mimeType: mimeType,

				previewUrl: attachment1.preview_url,
				previewWidth: attachment1.preview_width,
				previewHeight: attachment1.preview_height,

				url: attachment2.image_data.url,
				width: attachment2.image_data.width,
				height: attachment2.image_data.height,

				name: attachment1.name, // @Legacy
				facebookUrl: attachment1.url, // @Legacy
				thumbnailUrl: attachment1.thumbnail_url, // @Legacy
				rawGifImage: attachment2.image_data.raw_gif_image, // @Legacy
				rawWebpImage: attachment2.image_data.raw_webp_image, // @Legacy
				animatedGifUrl: attachment2.image_data.animated_gif_url, // @Legacy
				animatedGifPreviewUrl: attachment2.image_data.animated_gif_preview_url, // @Legacy
				animatedWebpUrl: attachment2.image_data.animated_webp_url, // @Legacy
				animatedWebpPreviewUrl: attachment2.image_data.animated_webp_preview_url // @Legacy
			};
		}
		case "share": {
			return {
				type: "share",
				ID: attachment1.share.share_id.toString(),
				url: attachment2.href,

				title: attachment1.share.title,
				description: attachment1.share.description,
				source: attachment1.share.source,

				image: attachment1.share.media.image,
				width: attachment1.share.media.image_size.width,
				height: attachment1.share.media.image_size.height,
				playable: attachment1.share.media.playable,
				duration: attachment1.share.media.duration,

				subattachments: attachment1.share.subattachments,
				properties: {},

				animatedImageSize: attachment1.share.media.animated_image_size, // @Legacy
				facebookUrl: attachment1.share.uri, // @Legacy
				target: attachment1.share.target, // @Legacy
				styleList: attachment1.share.style_list // @Legacy
			};
		}
		case "video": {
			return {
				type: "video",
				ID: attachment1.metadata.fbid.toString(),
				filename: attachment1.name,
				fullFileName: fullFileName,
				original_extension: getExtension(
					attachment1.original_extension,
					fullFileName
				),
				mimeType: mimeType,
				duration: durationVideo,

				previewUrl: attachment1.preview_url,
				previewWidth: attachment1.preview_width,
				previewHeight: attachment1.preview_height,

				url: attachment1.url,
				width: attachment1.metadata.dimensions.width,
				height: attachment1.metadata.dimensions.height,

				videoType: "unknown",

				thumbnailUrl: attachment1.thumbnail_url // @Legacy
			};
		}
		case "error": {
			return {
				type: "error",

				// Save error attachments because we're unsure of their format,
				// and whether there are cases they contain something useful for debugging.
				attachment1: attachment1,
				attachment2: attachment2
			};
		}
		case "MessageImage": {
			return {
				type: "photo",
				ID: blob.legacy_attachment_id,
				filename: blob.filename,
				fullFileName: fullFileName,
				fileSize: fileSize,
				original_extension: getExtension(blob.original_extension, fullFileName),
				mimeType: mimeType,
				thumbnailUrl: blob.thumbnail.uri,

				previewUrl: blob.preview.uri,
				previewWidth: blob.preview.width,
				previewHeight: blob.preview.height,

				largePreviewUrl: blob.large_preview.uri,
				largePreviewWidth: blob.large_preview.width,
				largePreviewHeight: blob.large_preview.height,

				url: blob.large_preview.uri, // @Legacy
				width: blob.original_dimensions.x, // @Legacy
				height: blob.original_dimensions.y, // @Legacy
				name: blob.filename // @Legacy
			};
		}
		case "MessageAnimatedImage": {
			return {
				type: "animated_image",
				ID: blob.legacy_attachment_id,
				filename: blob.filename,
				fullFileName: fullFileName,
				original_extension: getExtension(blob.original_extension, fullFileName),
				mimeType: mimeType,

				previewUrl: blob.preview_image.uri,
				previewWidth: blob.preview_image.width,
				previewHeight: blob.preview_image.height,

				url: blob.animated_image.uri,
				width: blob.animated_image.width,
				height: blob.animated_image.height,

				thumbnailUrl: blob.preview_image.uri, // @Legacy
				name: blob.filename, // @Legacy
				facebookUrl: blob.animated_image.uri, // @Legacy
				rawGifImage: blob.animated_image.uri, // @Legacy
				animatedGifUrl: blob.animated_image.uri, // @Legacy
				animatedGifPreviewUrl: blob.preview_image.uri, // @Legacy
				animatedWebpUrl: blob.animated_image.uri, // @Legacy
				animatedWebpPreviewUrl: blob.preview_image.uri // @Legacy
			};
		}
		case "MessageVideo": {
			return {
				type: "video",
				ID: blob.legacy_attachment_id,
				filename: blob.filename,
				fullFileName: fullFileName,
				original_extension: getExtension(blob.original_extension, fullFileName),
				fileSize: fileSize,
				duration: durationVideo,
				mimeType: mimeType,

				previewUrl: blob.large_image.uri,
				previewWidth: blob.large_image.width,
				previewHeight: blob.large_image.height,

				url: blob.playable_url,
				width: blob.original_dimensions.x,
				height: blob.original_dimensions.y,

				videoType: blob.video_type.toLowerCase(),

				thumbnailUrl: blob.large_image.uri // @Legacy
			};
		}
		case "MessageAudio": {
			return {
				type: "audio",
				ID: blob.url_shimhash,
				filename: blob.filename,
				fullFileName: fullFileName,
				fileSize: fileSize,
				duration: durationAudio,
				original_extension: getExtension(blob.original_extension, fullFileName),
				mimeType: mimeType,

				audioType: blob.audio_type,
				url: blob.playable_url,

				isVoiceMail: blob.is_voicemail
			};
		}
		case "StickerAttachment":
		case "Sticker": {
			return {
				type: "sticker",
				ID: blob.id,
				url: blob.url,

				packID: blob.pack ? blob.pack.id : null,
				spriteUrl: blob.sprite_image,
				spriteUrl2x: blob.sprite_image_2x,
				width: blob.width,
				height: blob.height,

				caption: blob.label,
				description: blob.label,

				frameCount: blob.frame_count,
				frameRate: blob.frame_rate,
				framesPerRow: blob.frames_per_row,
				framesPerCol: blob.frames_per_column,

				stickerID: blob.id, // @Legacy
				spriteURI: blob.sprite_image, // @Legacy
				spriteURI2x: blob.sprite_image_2x // @Legacy
			};
		}
		case "MessageLocation": {
			const urlAttach = blob.story_attachment.url;
			const mediaAttach = blob.story_attachment.media;

			const u = querystring.parse(url.parse(urlAttach).query).u;
			const where1 = querystring.parse(url.parse(u).query).where1;
			const address = where1.split(", ");

			let latitude;
			let longitude;

			try {
				latitude = Number.parseFloat(address[0]);
				longitude = Number.parseFloat(address[1]);
			} catch (err) {
				/* empty */
			}

			let imageUrl;
			let width;
			let height;

			if (mediaAttach && mediaAttach.image) {
				imageUrl = mediaAttach.image.uri;
				width = mediaAttach.image.width;
				height = mediaAttach.image.height;
			}

			return {
				type: "location",
				ID: blob.legacy_attachment_id,
				latitude: latitude,
				longitude: longitude,
				image: imageUrl,
				width: width,
				height: height,
				url: u || urlAttach,
				address: where1,

				facebookUrl: blob.story_attachment.url, // @Legacy
				target: blob.story_attachment.target, // @Legacy
				styleList: blob.story_attachment.style_list // @Legacy
			};
		}
		case "ExtensibleAttachment": {
			return {
				type: "share",
				ID: blob.legacy_attachment_id,
				url: blob.story_attachment.url,

				title: blob.story_attachment.title_with_entities.text,
				description:
					blob.story_attachment.description &&
					blob.story_attachment.description.text,
				source: blob.story_attachment.source
					? blob.story_attachment.source.text
					: null,

				image:
					blob.story_attachment.media &&
					blob.story_attachment.media.image &&
					blob.story_attachment.media.image.uri,
				width:
					blob.story_attachment.media &&
					blob.story_attachment.media.image &&
					blob.story_attachment.media.image.width,
				height:
					blob.story_attachment.media &&
					blob.story_attachment.media.image &&
					blob.story_attachment.media.image.height,
				playable:
					blob.story_attachment.media &&
					blob.story_attachment.media.is_playable,
				duration:
					blob.story_attachment.media &&
					blob.story_attachment.media.playable_duration_in_ms,
				playableUrl:
					blob.story_attachment.media == null
						? null
						: blob.story_attachment.media.playable_url,

				subattachments: blob.story_attachment.subattachments,
				properties: blob.story_attachment.properties.reduce(function (
					obj,
					cur
				) {
					obj[cur.key] = cur.value.text;
					return obj;
				}, {}),

				facebookUrl: blob.story_attachment.url, // @Legacy
				target: blob.story_attachment.target, // @Legacy
				styleList: blob.story_attachment.style_list // @Legacy
			};
		}
		case "MessageFile": {
			return {
				type: "file",
				ID: blob.message_file_fbid,
				fullFileName: fullFileName,
				filename: blob.filename,
				fileSize: fileSize,
				mimeType: blob.mimetype,
				original_extension:
					blob.original_extension || fullFileName.split(".").pop(),

				url: blob.url,
				isMalicious: blob.is_malicious,
				contentType: blob.content_type,

				name: blob.filename
			};
		}
		default: {
			throw new Error(
				`unrecognized attach_file of type ${type}\`${JSON.stringify(attachment1, null, 4)} attachment2: ${JSON.stringify(attachment2, null, 4)}\``
			);
		}
	}
}

function formatAttachment(attachments, attachmentIds, attachmentMap, shareMap) {
	attachmentMap = shareMap || attachmentMap;
	return attachments
		? attachments.map(function (val, i) {
				if (
					!attachmentMap ||
					!attachmentIds ||
					!attachmentMap[attachmentIds[i]]
				) {
					return _formatAttachment(val);
				}
				return _formatAttachment(val, attachmentMap[attachmentIds[i]]);
			})
		: [];
}

function formatDeltaMessage(m) {
	const md = m.delta.messageMetadata;

	const mdata =
		m.delta.data === undefined
			? []
			: m.delta.data.prng === undefined
				? []
				: JSON.parse(m.delta.data.prng);
	const m_id = mdata.map((u) => u.i);
	const m_offset = mdata.map((u) => u.o);
	const m_length = mdata.map((u) => u.l);
	const mentions = {};
	for (let i = 0; i < m_id.length; i++) {
		mentions[m_id[i]] = m.delta.body.substring(
			m_offset[i],
			m_offset[i] + m_length[i]
		);
	}
	return {
		type: "message",
		senderID: formatID(md.actorFbId.toString()),
		body: m.delta.body || "",
		threadID: formatID(
			(md.threadKey.threadFbId || md.threadKey.otherUserFbId).toString()
		),
		messageID: md.messageId,
		attachments: (m.delta.attachments || []).map((v) => _formatAttachment(v)),
		mentions: mentions,
		timestamp: parseInt(md.timestamp),
		isGroup: !!md.threadKey.threadFbId,
		participantIDs:
			m.delta.participants ||
			(md.cid ? md.cid.canonicalParticipantFbids : []) ||
			[]
	};
}

function formatID(id) {
	if (id != undefined && id != null) {
		return id.replace(/(fb)?id[:.]/, "");
	} else {
		return id;
	}
}

function formatMessage(m) {
	const originalMessage = m.message ? m.message : m;
	const obj = {
		type: "message",
		senderName: originalMessage.sender_name,
		senderID: formatID(originalMessage.sender_fbid.toString()),
		participantNames: originalMessage.group_thread_info
			? originalMessage.group_thread_info.participant_names
			: [originalMessage.sender_name.split(" ")[0]],
		participantIDs: originalMessage.group_thread_info
			? originalMessage.group_thread_info.participant_ids.map(function (v) {
					return formatID(v.toString());
				})
			: [formatID(originalMessage.sender_fbid)],
		body: originalMessage.body || "",
		threadID: formatID(
			(
				originalMessage.thread_fbid || originalMessage.other_user_fbid
			).toString()
		),
		threadName: originalMessage.group_thread_info
			? originalMessage.group_thread_info.name
			: originalMessage.sender_name,
		location: originalMessage.coordinates ? originalMessage.coordinates : null,
		messageID: originalMessage.mid
			? originalMessage.mid.toString()
			: originalMessage.message_id,
		attachments: formatAttachment(
			originalMessage.attachments,
			originalMessage.attachmentIds,
			originalMessage.attachment_map,
			originalMessage.share_map
		),
		timestamp: parseInt(originalMessage.timestamp),
		timestampAbsolute: originalMessage.timestamp_absolute,
		timestampRelative: originalMessage.timestamp_relative,
		timestampDatetime: originalMessage.timestamp_datetime,
		tags: originalMessage.tags,
		reactions: originalMessage.reactions ? originalMessage.reactions : [],
		isUnread: originalMessage.is_unread
	};

	if (m.type === "pages_messaging") {
		obj.pageID = m.realtime_viewer_fbid.toString();
	}
	obj.isGroup = obj.participantIDs.length > 2;

	return obj;
}

function formatEvent(m) {
	const originalMessage = m.message ? m.message : m;
	let logMessageType = originalMessage.log_message_type;
	let logMessageData;
	if (logMessageType === "log:generic-admin-text") {
		logMessageData = originalMessage.log_message_data.untypedData;
		logMessageType = getAdminTextMessageType(
			originalMessage.log_message_data.message_type
		);
	} else {
		logMessageData = originalMessage.log_message_data;
	}

	return Object.assign(formatMessage(originalMessage), {
		type: "event",
		logMessageType: logMessageType,
		logMessageData: logMessageData,
		logMessageBody: originalMessage.log_message_body
	});
}

function formatHistoryMessage(m) {
	switch (m.action_type) {
		case "ma-type:log-message":
			return formatEvent(m);
		default:
			return formatMessage(m);
	}
}

// Get a more readable message type for AdminTextMessages
function getAdminTextMessageType(type) {
	switch (type) {
		case "change_thread_theme":
			return "log:thread-color";
		case "change_thread_icon":
		case "change_thread_quick_reaction":
			return "log:thread-icon";
		case "change_thread_nickname":
			return "log:user-nickname";
		case "change_thread_admins":
			return "log:thread-admins";
		case "group_poll":
			return "log:thread-poll";
		case "change_thread_approval_mode":
			return "log:thread-approval-mode";
		case "messenger_call_log":
		case "participant_joined_group_call":
			return "log:thread-call";
		default:
			return type;
	}
}

function formatDeltaEvent(m) {
	let logMessageType;
	let logMessageData;

	// log:thread-color => {theme_color}
	// log:user-nickname => {participant_id, nickname}
	// log:thread-icon => {thread_icon}
	// log:thread-name => {name}
	// log:subscribe => {addedParticipants - [Array]}
	// log:unsubscribe => {leftParticipantFbId}

	switch (m.class) {
		case "AdminTextMessage":
			logMessageData = m.untypedData;
			logMessageType = getAdminTextMessageType(m.type);
			break;
		case "ThreadName":
			logMessageType = "log:thread-name";
			logMessageData = { name: m.name };
			break;
		case "ParticipantsAddedToGroupThread":
			logMessageType = "log:subscribe";
			logMessageData = { addedParticipants: m.addedParticipants };
			break;
		case "ParticipantLeftGroupThread":
			logMessageType = "log:unsubscribe";
			logMessageData = { leftParticipantFbId: m.leftParticipantFbId };
			break;
		case "ApprovalQueue":
			logMessageType = "log:approval-queue";
			logMessageData = {
				approvalQueue: {
					action: m.action,
					recipientFbId: m.recipientFbId,
					requestSource: m.requestSource,
					...m.messageMetadata
				}
			};
	}

	return {
		type: "event",
		threadID: formatID(
			(
				m.messageMetadata.threadKey.threadFbId ||
				m.messageMetadata.threadKey.otherUserFbId
			).toString()
		),
		messageID: m.messageMetadata.messageId.toString(),
		logMessageType: logMessageType,
		logMessageData: logMessageData,
		logMessageBody: m.messageMetadata.adminText,
		timestamp: parseInt(m.messageMetadata.timestamp),
		author: m.messageMetadata.actorFbId,
		participantIDs: (m.participants || []).map((p) => p.toString())
	};
}

function formatTyp(event) {
	return {
		isTyping: !!event.st,
		from: event.from.toString(),
		threadID: formatID(
			(event.to || event.thread_fbid || event.from).toString()
		),
		// When receiving typ indication from mobile, `from_mobile` isn't set.
		// If it is, we just use that value.
		fromMobile: event.hasOwnProperty("from_mobile") ? event.from_mobile : true,
		userID: (event.realtime_viewer_fbid || event.from).toString(),
		type: "typ"
	};
}

function formatDeltaReadReceipt(delta) {
	// otherUserFbId seems to be used as both the readerID and the threadID in a 1-1 chat.
	// In a group chat actorFbId is used for the reader and threadFbId for the thread.
	return {
		type: "read_receipt",
		reader: (delta.threadKey.otherUserFbId || delta.actorFbId).toString(),
		timestamp: parseInt(delta.actionTimestampMs),
		threadID: formatID(
			(delta.threadKey.otherUserFbId || delta.threadKey.threadFbId).toString()
		)
	};
}

function formatDeltaDeliveryReceipt(delta) {
	return {
		type: "delivery_receipt",
		deliveryReceiptFrom: delta.actorFbId.toString(),
		messageIDs: delta.messageIds,
		threadID: formatID(
			(delta.threadKey.otherUserFbId || delta.threadKey.threadFbId).toString()
		),
		timestamp: parseInt(delta.deliveredWatermarkTimestampMs)
	};
}

function formatReadReceipt(event) {
	return {
		type: "read_receipt",
		reader: event.reader.toString(),
		time: event.time,
		threadID: formatID((event.thread_fbid || event.reader).toString())
	};
}

function formatRead(event) {
	return {
		type: "read",
		threadID: formatID(
			(
				(event.chat_ids && event.chat_ids[0]) ||
				(event.thread_fbids && event.thread_fbids[0])
			).toString()
		),
		timestamp: parseInt(event.timestamp)
	};
}

function getFrom(str, startToken, endToken) {
	const start = str.indexOf(startToken) + startToken.length;
	if (start < startToken.length) {
		return "";
	}

	const lastHalf = str.substring(start);
	const end = lastHalf.indexOf(endToken);
	if (end === -1) {
		throw new Error(
			"Could not find endTime `" + endToken + "` in the given string."
		);
	}
	return lastHalf.substring(0, end);
}

function makeParsable(html) {
	const withoutForLoop = html.replace(/for\s*\(\s*;\s*;\s*\)\s*;\s*/, "");

	const maybeMultipleObjects = withoutForLoop.split(/\}\r\n *\{/);
	if (maybeMultipleObjects.length === 1) {
		return maybeMultipleObjects;
	}

	return "[" + maybeMultipleObjects.join("},{") + "]";
}

function arrToForm(form) {
	return arrayToObject(
		form,
		function (v) {
			return v.name;
		},
		function (v) {
			return v.val;
		}
	);
}

function arrayToObject(arr, getKey, getValue) {
	return arr.reduce(function (acc, val) {
		acc[getKey(val)] = getValue(val);
		return acc;
	}, {});
}

function getSignatureID() {
	return Math.floor(Math.random() * 2147483648).toString(16);
}

function generateTimestampRelative() {
	const d = new Date();
	return d.getHours() + ":" + padZeros(d.getMinutes());
}

function makeDefaults(html, userID, ctx) {
	let reqCounter = 1;
	const fb_dtsg = (html.match(/"dtsg":\{"token":"([^"]+)"/) ||
		html.match(/"DTSGInitData",\[\],\{"token":"([^"]+)"/))[1];

	let ttstamp = "2";
	for (let i = 0; i < fb_dtsg.length; i++) {
		ttstamp += fb_dtsg.charCodeAt(i);
	}
	const revision = getFrom(html, 'revision":', ",");

	function mergeWithDefaults(obj) {
		const newObj = {
			av: userID,
			__user: userID,
			__req: (reqCounter++).toString(36),
			__rev: revision,
			__a: 1,
			fb_dtsg: ctx.fb_dtsg || fb_dtsg,
			jazoest: ctx.ttstamp || ttstamp
		};

		if (!obj) {
			return newObj;
		}

		for (const prop in obj) {
			if (obj.hasOwnProperty(prop)) {
				if (!newObj[prop]) {
					newObj[prop] = obj[prop];
				}
			}
		}

		return newObj;
	}

	return {
		get: (url, jar, qs, ctxx, customHeader = {}) =>
			get(
				url,
				jar,
				mergeWithDefaults(qs),
				ctx.globalOptions,
				ctxx || ctx,
				customHeader
			),
		post: (url, jar, form, ctxx, customHeader = {}) =>
			post(
				url,
				jar,
				mergeWithDefaults(form),
				ctx.globalOptions,
				ctxx || ctx,
				customHeader
			),
		postFormData: (url, jar, form, qs, ctxx) =>
			postFormData(
				url,
				jar,
				mergeWithDefaults(form),
				mergeWithDefaults(qs),
				ctx.globalOptions,
				ctxx || ctx
			)
	};
}

function parseAndCheckLogin(ctx, defaultFuncs, retryCount, sourceCall) {
	if (retryCount == undefined) {
		retryCount = 0;
	}
	if (sourceCall == undefined) {
		try {
			throw new Error();
		} catch (e) {
			sourceCall = e;
		}
	}
	return function (data) {
		return tryPromise(function () {
			log.verbose("parseAndCheckLogin", data.body);
			if (data.statusCode >= 500 && data.statusCode < 600) {
				if (retryCount >= 5) {
					throw new FcaError({
						message:
							"Request retry failed. Check the `res` and `statusCode` property on this error.",
						statusCode: data.statusCode,
						res: data.body,
						error:
							"Request retry failed. Check the `res` and `statusCode` property on this error.",
						sourceCall: sourceCall
					});
				}
				retryCount++;
				const retryTime = Math.floor(Math.random() * 5000);
				log.warn(
					"parseAndCheckLogin",
					`Got status code ${data.statusCode} - ${retryCount}. attempt to retry in ${retryTime} milliseconds...`
				);
				const url = `${data.request.uri.protocol}//${data.request.uri.hostname}${data.request.uri.pathname}`;
				if (
					data.request.headers["Content-Type"].split(";")[0] ===
					"multipart/form-data"
				) {
					return delay(retryTime)
						.then(function () {
							return defaultFuncs.postFormData(
								url,
								ctx.jar,
								data.request.formData,
								{}
							);
						})
						.then(
							parseAndCheckLogin(ctx, defaultFuncs, retryCount, sourceCall)
						);
				} else {
					return delay(retryTime)
						.then(function () {
							return defaultFuncs.post(url, ctx.jar, data.request.formData);
						})
						.then(
							parseAndCheckLogin(ctx, defaultFuncs, retryCount, sourceCall)
						);
				}
			}
			if (data.statusCode !== 200) {
				throw new FcaError({
					message: `parseAndCheckLogin got status code: ${data.statusCode}. Bailing out of trying to parse response.`,
					statusCode: data.statusCode,
					res: data.body,
					error: `parseAndCheckLogin got status code: ${data.statusCode}. Bailing out of trying to parse response.`,
					sourceCall: sourceCall
				});
			}

			let res = null;
			try {
				res = JSON.parse(makeParsable(data.body));
			} catch (e) {
				throw new FcaError({
					message:
						"JSON.parse error. Check the `detail` property on this error.",
					detail: e,
					res: data.body,
					error: "JSON.parse error. Check the `detail` property on this error.",
					sourceCall: sourceCall
				});
			}

			// In some cases the response contains only a redirect URL which should be followed
			if (res.redirect && data.request.method === "GET") {
				return defaultFuncs
					.get(res.redirect, ctx.jar)
					.then(parseAndCheckLogin(ctx, defaultFuncs, undefined, sourceCall));
			}

			// TODO: handle multiple cookies?
			if (
				res.jsmods &&
				res.jsmods.require &&
				Array.isArray(res.jsmods.require[0]) &&
				res.jsmods.require[0][0] === "Cookie"
			) {
				res.jsmods.require[0][3][0] = res.jsmods.require[0][3][0].replace(
					"_js_",
					""
				);
				const cookie = formatCookie(res.jsmods.require[0][3], "facebook");
				const cookie2 = formatCookie(res.jsmods.require[0][3], "messenger");
				ctx.jar.setCookie(cookie, "https://www.facebook.com");
				ctx.jar.setCookie(cookie2, "https://www.messenger.com");
			}

			// On every request we check if we got a DTSG and we mutate the context so that we use the latest
			// one for the next requests.
			if (res.jsmods && Array.isArray(res.jsmods.require)) {
				const arr = res.jsmods.require;
				for (const i in arr) {
					if (arr[i][0] === "DTSG" && arr[i][1] === "setToken") {
						ctx.fb_dtsg = arr[i][3][0];

						// Update ttstamp since that depends on fb_dtsg
						ctx.ttstamp = "2";
						for (let j = 0; j < ctx.fb_dtsg.length; j++) {
							ctx.ttstamp += ctx.fb_dtsg.charCodeAt(j);
						}
					}
				}
			}

			if (res.error === 1357001) {
				throw new FcaError({
					message:
						"Facebook blocked login. Please visit https://facebook.com and check your account.",
					error: "Not logged in.",
					res: res,
					statusCode: data.statusCode,
					sourceCall: sourceCall
				});
			}
			return res;
		});
	};
}

function checkLiveCookie(ctx, defaultFuncs) {
	return defaultFuncs
		.get("https://facebook.com/settings", ctx.jar, {}, null, null, false)
		.then(function (res) {
			const redirectUrl = res.request.uri.href;
			if (redirectUrl) {
				const isCheckpoint = redirectUrl.indexOf("checkpoint") > -1;
				const paramsDecoded = decodeURIComponent(redirectUrl.split("?")[1]);
				const checkpointCode = paramsDecoded.match(/checkpoint\/(\d+)/);
				if (isCheckpoint) {
					throw new FcaError({
						message:
							"Maybe your account is locked. Please visit https://facebook.com and check your account.",
						error: "Checkpoint",
						checkpointCode: checkpointCode ? checkpointCode[1] : null,
						checkpointUrl: redirectUrl
					});
				}
			}

			if (res.body.indexOf(ctx.i_userID || ctx.userID) === -1) {
				throw new FcaError({
					message: "Not logged in.",
					error: "Not logged in."
				});
			}
			return true;
		});
}

function saveCookies(jar) {
	return function (res) {
		const cookies = res.headers["set-cookie"] || [];
		cookies.forEach(function (c) {
			if (c.indexOf(".facebook.com") > -1) {
				jar.setCookie(c, "https://www.facebook.com");
			}
			const c2 = c.replace(/domain=\.facebook\.com/, "domain=.messenger.com");
			jar.setCookie(c2, "https://www.messenger.com");
		});
		return res;
	};
}

const NUM_TO_MONTH = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec"
];
const NUM_TO_DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function formatDate(date) {
	let d = date.getUTCDate();
	d = d >= 10 ? d : "0" + d;
	let h = date.getUTCHours();
	h = h >= 10 ? h : "0" + h;
	let m = date.getUTCMinutes();
	m = m >= 10 ? m : "0" + m;
	let s = date.getUTCSeconds();
	s = s >= 10 ? s : "0" + s;
	return (
		NUM_TO_DAY[date.getUTCDay()] +
		", " +
		d +
		" " +
		NUM_TO_MONTH[date.getUTCMonth()] +
		" " +
		date.getUTCFullYear() +
		" " +
		h +
		":" +
		m +
		":" +
		s +
		" GMT"
	);
}

function formatCookie(arr, url) {
	return (
		arr[0] + "=" + arr[1] + "; Path=" + arr[3] + "; Domain=" + url + ".com"
	);
}

function formatThread(data) {
	return {
		threadID: formatID(data.thread_fbid.toString()),
		participants: data.participants.map(formatID),
		participantIDs: data.participants.map(formatID),
		name: data.name,
		nicknames: data.custom_nickname,
		snippet: data.snippet,
		snippetAttachments: data.snippet_attachments,
		snippetSender: formatID((data.snippet_sender || "").toString()),
		unreadCount: data.unread_count,
		messageCount: data.message_count,
		imageSrc: data.image_src,
		timestamp: parseInt(data.timestamp),
		serverTimestamp: data.server_timestamp, // what is this?
		muteUntil: data.mute_until,
		isCanonicalUser: data.is_canonical_user,
		isCanonical: data.is_canonical,
		isSubscribed: data.is_subscribed,
		folder: data.folder,
		isArchived: data.is_archived,
		recipientsLoadable: data.recipients_loadable,
		hasEmailParticipant: data.has_email_participant,
		readOnly: data.read_only,
		canReply: data.can_reply,
		cannotReplyReason: data.cannot_reply_reason,
		lastMessageTimestamp: data.last_message_timestamp,
		lastReadTimestamp: data.last_read_timestamp,
		lastMessageType: data.last_message_type,
		emoji: data.custom_like_icon,
		color: data.custom_color,
		adminIDs: data.admin_ids,
		threadType: data.thread_type
	};
}

function getType(obj) {
	const type = Object.prototype.toString.call(obj).slice(8, -1);
	return type;
}

/**
 *
 * @param {*} obj - Variable to check
 * @param {*} types - String or Array of strings to check against
 * @returns
 */
function isOfType(obj, types) {
	if (!Array.isArray(types)) {
		types = [types];
	}

	return types.indexOf(getType(obj)) !== -1;
}

function countOccurrences(string, subString) {
	return string.split(subString).length - 1;
}

function formatProxyPresence(presence, userID) {
	if (presence.lat === undefined || presence.p === undefined) {
		return null;
	}
	return {
		type: "presence",
		timestamp: presence.lat * 1000,
		userID: userID,
		statuses: presence.p
	};
}

function formatPresence(presence, userID) {
	return {
		type: "presence",
		timestamp: presence.la * 1000,
		userID: userID,
		statuses: presence.a
	};
}

function decodeClientPayload(payload) {
	/*
	Special function which Client using to "encode" clients JSON payload
	*/
	return JSON.parse(String.fromCharCode.apply(null, payload));
}

function getAppState(jar) {
	return jar
		.getCookies("https://www.facebook.com")
		.concat(jar.getCookies("https://facebook.com"))
		.concat(jar.getCookies("https://www.messenger.com"));
}

function getIrisMQTTData(html) {
	const oldFBMQTTMatch = html.match(
		/irisSeqID:"(.+?)",appID:219994525426954,endpoint:"(.+?)"/
	);
	const oldFBMQTTMatch2 = html.match(
		/"endpoint":"wss:\/\/edge-chat.facebook.com\/chat\?region=(.+?)"/
	);

	let mqttEndpoint = null;
	let region = null;
	let irisSeqID = null;
	let noMqttData = null;

	if (oldFBMQTTMatch) {
		irisSeqID = oldFBMQTTMatch[1];
		mqttEndpoint = oldFBMQTTMatch[2];
		region = new URL(mqttEndpoint).searchParams.get("region").toUpperCase();
		log.info("login", `Got this account's message region: ${region}`);
	} else if (oldFBMQTTMatch2) {
		region = oldFBMQTTMatch2[1].toUpperCase();
		mqttEndpoint = `wss://edge-chat.facebook.com/chat?region=${region.toUpperCase()}`;
		log.info("login", `Got this account's message region: ${region}`);
	} else {
		const newFBMQTTMatch = html.match(
			/{"app_id":"219994525426954","endpoint":"(.+?)","iris_seq_id":"(.+?)"}/
		);
		if (newFBMQTTMatch) {
			irisSeqID = newFBMQTTMatch[2];
			mqttEndpoint = newFBMQTTMatch[1].replace(/\\\//g, "/");
			region = new URL(mqttEndpoint).searchParams.get("region").toUpperCase();
			log.info("login", `Got this account's message region: ${region}`);
		} else {
			const legacyFBMQTTMatch = html.match(
				/(\["MqttWebConfig",\[\],{fbid:")(.+?)(",appID:219994525426954,endpoint:")(.+?)(",pollingEndpoint:")(.+?)(3790])/
			);
			if (legacyFBMQTTMatch) {
				mqttEndpoint = legacyFBMQTTMatch[4];
				region = new URL(mqttEndpoint).searchParams.get("region").toUpperCase();
				log.warn(
					"login",
					`Cannot get sequence ID with new RegExp. Fallback to old RegExp (without seqID)...`
				);
				log.info("login", `Got this account's message region: ${region}`);
				log.info("login", `[Unused] Polling endpoint: ${legacyFBMQTTMatch[6]}`);
			} else {
				log.warn("login", "Cannot get MQTT region & sequence ID.");
				noMqttData = html;
			}
		}
	}

	const oldSeqMatch = html.match(/"upsertSequenceId",\[\d+,"(\d+)"\]/);
	if (oldSeqMatch) {
		irisSeqID = oldSeqMatch[1];
	}

	return {
		mqttEndpoint,
		region,
		irisSeqID,
		noMqttData
	};
}

module.exports = {
	FcaError,
	_formatAttachment,
	arrToForm,
	checkLiveCookie,
	countOccurrences,
	decodeClientPayload,
	formatCookie,
	formatDate,
	formatDeltaDeliveryReceipt,
	formatDeltaEvent,
	formatDeltaMessage,
	formatDeltaReadReceipt,
	formatHistoryMessage,
	formatID,
	formatMessage,
	formatPresence,
	formatProxyPresence,
	formatRead,
	formatReadReceipt,
	formatThread,
	formatTyp,
	generateAccessiblityCookie,
	generateOfflineThreadingID,
	generatePresence,
	generateThreadingID,
	generateTimestampRelative,
	get,
	getAdminTextMessageType,
	getAppState,
	getFrom,
	getGUID,
	getIrisMQTTData,
	getJar: request.jar,
	getSignatureID,
	getType,
	isOfType,
	isReadableStream,
	makeDefaults,
	makeParsable,
	parseAndCheckLogin,
	post,
	postFormData,
	saveCookies,
	setProxy
};
