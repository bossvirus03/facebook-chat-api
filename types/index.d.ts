import { Cookie } from "@/types";
import { EventEmitter } from "events";
import { Readable } from "stream";
import { GetThreadInfoResult } from "./getThreadInfo";
import { ReadStream } from "fs";

// Attachments
export type StickerAttachment = {
	type: "sticker";
	ID: string;
	url: string;
	packID?: string;
	spriteUrl?: string;
	spriteUrl2x?: string;
	width?: number;
	height?: number;
	caption?: string;
	description?: string;
	frameCount?: number;
	frameRate?: number;
	framesPerRow?: number;
	framesPerCol?: number;
};

export type FileAttachment = {
	type: "file";
	ID: string;
	filename: string;
	url: string;
	isMalicious?: boolean;
	contentType?: string;
};

export type PhotoAttachment = {
	type: "photo";
	ID: string;
	filename?: string;
	thumbnailUrl?: string;
	previewUrl?: string;
	previewWidth?: number;
	previewHeight?: number;
	largePreviewUrl?: string;
	largePreviewWidth?: number;
	largePreviewHeight?: number;
};

export type AnimatedImageAttachment = {
	type: "animated_image";
	ID: string;
	filename?: string;
	previewUrl?: string;
	previewWidth?: number;
	previewHeight?: number;
	url?: string;
	width?: number;
	height?: number;
};

export type VideoAttachment = {
	type: "video";
	ID: string;
	filename?: string;
	previewUrl?: string;
	previewWidth?: number;
	previewHeight?: number;
	url?: string;
	width?: number;
	height?: number;
	duration?: number;
	videoType?: string;
};

export type AudioAttachment = {
	type: "audio";
	ID: string;
	filename?: string;
	audioType?: string;
	duration?: number;
	url?: string;
	isVoiceMail?: boolean;
};

export type LocationAttachment = {
	type: "location";
	ID: string;
	latitude: number;
	longitude: number;
	image?: string;
	width?: number;
	height?: number;
	url?: string;
	address?: string;
};

export type ShareAttachment = {
	type: "share";
	ID: string;
	url?: string;
	title?: string;
	description?: string;
	source?: string;
	image?: string;
	width?: number;
	height?: number;
	playable?: boolean;
	duration?: number;
	playableUrl?: string;
	subattachments?: ShareAttachment[];
	properties?: Record<string, any>;
};

export type Attachment =
	| StickerAttachment
	| FileAttachment
	| PhotoAttachment
	| AnimatedImageAttachment
	| VideoAttachment
	| AudioAttachment
	| LocationAttachment
	| ShareAttachment;

// Common
export interface BaseMessage {
	threadID: string;
	type: string;
}

// Message
export interface Message extends BaseMessage {
	type: "message";
	attachments?: Attachment[];
	body: string;
	isGroup?: boolean;
	mentions?: Record<string, string>;
	messageID: string;
	senderID: string;
	isUnread?: boolean;
	participantIDs: string[];
}

// Message reply
export interface MessageReply extends Message {
	type: "message_reply";
	messageReply: Message;
}

export type EventMessage =
	| ThreadImageChangedEvent
	| ThreadParticipantAddedEvent
	| ThreadParticipantRemovedEvent
	| ThreadNameChangedEvent
	| ThreadColorChangedEvent
	| ThreadIconChangedEvent
	| NicknameChangedEvent
	| ThreadAdminsChangedEvent
	| ThreadPollEvent
	| ThreadApprovalModeChangedEvent
	| ThreadCallEvent;

export interface ThreadImageChangedEvent extends BaseMessage {
	type: "event";
	author: string;
	logMessageBody: string;
	logMessageData: {
		image: {
			attachmentID: string;
			width: number;
			height: number;
			url: string;
		};
	};
	logMessageType: "log:thread-image";
	threadID: string;
}

export interface ThreadParticipantAddedEvent extends BaseMessage {
	type: "event";
	author: string;
	logMessageBody: string;
	logMessageData: {
		addedParticipants: {
			fanoutPolicy: string;
			firstName: string;
			fullName: string;
			groupJoinStatus: string;
			initialFolder: string;
			initialFolderId: {
				systemFolderId: string;
			};
			lastUnsubscribeTimestampMs: string;
			userFbId: string;
			isMessengerUser: boolean;
		}[];
	};
	logMessageType: "log:subscribe";
	threadID: string;
	participantIDs: string[];
}

export interface ThreadParticipantRemovedEvent extends BaseMessage {
	type: "event";
	author: string;
	logMessageBody: string;
	logMessageData: { leftParticipantFbId: string };
	logMessageType: "log:unsubscribe";
	threadID: string;
	participantIDs: string[];
}

export interface ThreadNameChangedEvent extends BaseMessage {
	type: "event";
	author: string;
	logMessageBody: string;
	logMessageData: { name: string };
	logMessageType: "log:thread-name";
	threadID: string;
	participantIDs: string[];
}

export interface ThreadColorChangedEvent extends BaseMessage {
	type: "event";
	author: string;
	logMessageBody: string;
	logMessageData: {
		theme_color: string;
		gradient?: string;
		should_show_icon: string;
		theme_id: string;
		accessibility_label: string;
		theme_name_with_subtitle: string;
		theme_emoji?: string;
	};
	logMessageType: "log:thread-color";
	threadID: string;
	participantIDs: string[];
}

export interface ThreadIconChangedEvent extends BaseMessage {
	type: "event";
	author: string;
	logMessageBody: string;
	logMessageData: {
		thread_quick_reaction_instruction_key_id: string;
		thread_quick_reaction_emoji: string;
		thread_quick_reaction_emoji_url: string;
	};
	logMessageType: "log:thread-icon";
	threadID: string;
	participantIDs: string[];
}

export interface NicknameChangedEvent extends BaseMessage {
	type: "event";
	author: string;
	logMessageBody: string;
	logMessageData: {
		nickname: string;
		participant_id: string;
	};
	logMessageType: "log:user-nickname";
	threadID: string;
	participantIDs: string[];
}

export interface ThreadAdminsChangedEvent extends BaseMessage {
	type: "event";
	author: string;
	logMessageBody: string;
	logMessageData: {
		THREAD_CATEGORY: string;
		TARGET_ID: string;
		ADMIN_TYPE: string;
		ADMIN_EVENT: "add_admin" | "remove_admin";
	};
	logMessageType: "log:thread-admins";
	threadID: string;
	participantIDs: string[];
}

export interface ThreadPollEvent extends BaseMessage {
	type: "event";
	author: string;
	logMessageBody: string;
	logMessageData: {
		removed_option_ids: string;
		question_json: string;
		event_type:
			| "question_creation"
			| "update_vote"
			| "add_unvoted_option"
			| "multiple_updates";
		added_option_ids: string;
		new_option_texts: string;
		new_option_ids: string;
		question_id: string;
	};
	logMessageType: "log:thread-poll";
	threadID: string;
	participantIDs: string[];
}

export interface ThreadApprovalModeChangedEvent extends BaseMessage {
	type: "event";
	author: string;
	logMessageBody: string;
	logMessageData: { APPROVAL_MODE: "0" | "1"; THREAD_CATEGORY: string };
	logMessageType: "log:thread-approval-mode";
	threadID: string;
	participantIDs: string[];
}

export interface ThreadCallEvent extends BaseMessage {
	type: "event";
	author: string;
	logMessageBody: string;
	logMessageData: any;
	logMessageType: "log:thread-call";
	threadID: string;
	participantIDs: string[];
}

// Typing
export interface TypingEvent extends BaseMessage {
	type: "typ";
	from: string;
	fromMobile?: boolean;
	isTyping: boolean;
}

// Read
export interface ReadEvent extends BaseMessage {
	type: "read";
	time: number;
}

// Read receipt
export interface ReadReceiptEvent extends BaseMessage {
	type: "read_receipt";
	reader: string;
	time: number;
}

// Message reaction
export interface MessageReactionEvent extends BaseMessage {
	type: "message_reaction";
	threadID: string;
	messageID: string;
	reaction: string;
	senderID: string;
	userID: string;
}

// Presence
export interface PresenceEvent extends BaseMessage {
	type: "presence";
	statuses: number;
	timestamp: number;
	userID: string;
}

// Unsend
export interface MessageUnsendEvent extends BaseMessage {
	type: "message_unsend";
	senderID: string;
	messageID: string;
	deletionTimestamp: number;
}

// Union type for all events
export type ListenMqttEvent =
	| Message
	| MessageReply
	| EventMessage
	| TypingEvent
	| ReadEvent
	| ReadReceiptEvent
	| MessageReactionEvent
	| PresenceEvent
	| MessageUnsendEvent;

export interface ListenMqttEmitter extends EventEmitter {
	stopListening: () => void;
	on(event: "message", listener: (message: ListenMqttEvent) => void): this;
	on(event: "error", listener: (error: Error) => void): this;
}

export interface ListenMqttError {
	error?: string;
	detail: string;
	res?: any;
	type: string;
}

export type ListenMqttCallback = (
	error: ListenMqttError | null,
	event?: ListenMqttEvent
) => void;

export interface Mention {
	/**
	 * Đoạn text trong `body` được đề cập.
	 */
	tag: string;

	/**
	 * ID người dùng Facebook được đề cập.
	 */
	id?: string | number;

	/**
	 * Vị trí bắt đầu tìm kiếm `tag` trong `body`.
	 */
	fromIndex?: number;
}

export interface Location {
	/**
	 * Vĩ độ (latitude) của vị trí.
	 */
	latitude: number;

	/**
	 * Kinh độ (longitude) của vị trí.
	 */
	longitude: number;

	/**
	 * Đánh dấu là vị trí hiện tại (tuỳ chọn).
	 */
	current?: boolean;
}

export type EmojiSize = "small" | "medium" | "large";

export type Attachment =
	| Readable
	| {
			stream: Readable;
			name?: string;
			contentType?: string;
	  };

export interface MessageOptions {
	/**
	 * Nội dung tin nhắn dạng text.
	 */
	body?: string;

	/**
	 * Tệp đính kèm (ảnh, video, âm thanh, tài liệu...).
	 * Có thể là 1 hoặc nhiều file dạng Readable stream.
	 */
	attachment?: ReadStream | ReadStream[];

	/**
	 * Link URL ảnh/video để Facebook tự fetch làm file gửi đi.
	 */
	url?: string;

	/**
	 * ID sticker.
	 */
	sticker?: string | number;

	/**
	 * Gửi emoji đặc biệt.
	 */
	emoji?: string;

	/**
	 * Kích thước emoji (chỉ dùng nếu có `emoji`).
	 */
	emojiSize?: EmojiSize;

	/**
	 * Danh sách người được nhắc đến trong `body`.
	 */
	mentions?: Mention[];

	/**
	 * Gửi vị trí địa lý.
	 */
	location?: Location;
}

export interface MessageResponse {
	/**
	 * ID cuộc trò chuyện (thread).
	 */
	threadID: string;

	/**
	 * ID của tin nhắn vừa gửi.
	 */
	messageID: string;

	/**
	 * Thời điểm gửi (timestamp).
	 */
	timestamp: number;
}

/**
 * ID của người nhận hoặc nhóm. Có thể là:
 * - string: ID Facebook (dạng số hoặc page)
 * - number: ID dạng số
 * - Array: gửi nhóm mới tạo từ danh sách người
 */
export type ThreadID = string | number | Array<string | number>;

interface FacebookChatAPI extends EventEmitter {
	addExternalModule: (moduleObj: Record<string, Function>) => void;
	addUserToGroup: (
		threadID: string,
		userIDs: string | string[]
	) => Promise<boolean>;
	changeAdminStatus: (
		threadID: string,
		adminIDs: string | string[],
		adminStatus: boolean
	) => Promise<boolean>;
	changeArchivedStatus: (
		threadIDs: string | string[],
		archive: boolean
	) => Promise<boolean>;
	changeAvatar: (
		image: Buffer,
		caption?: string,
		timestampExpiry?: number
	) => Promise<any>;
	changeBio: (bio: string, publish?: boolean) => Promise<boolean>;
	changeBlockedStatus: (
		userID: string,
		blockStatus: boolean
	) => Promise<boolean>;
	changeGroupImage: (threadID: string, image: Buffer) => Promise<boolean>;
	changeNickname: (
		threadID: string,
		participantID: string,
		nickname: string
	) => Promise<boolean>;
	changeThreadColor: (threadID: string, color: string) => Promise<any>;
	changeThreadEmoji: (threadID: string, emoji: string) => Promise<any>;
	createNewGroup: (
		participantIDs: string[],
		groupTitle?: string
	) => Promise<string>;
	createPoll: (
		threadID: string,
		title: string,
		options?: Record<string, boolean>
	) => Promise<void>;
	deleteMessage: (messageIDs: string | string[]) => Promise<void>;
	deleteThread: (threadIDs: string | string[]) => Promise<void>;
	editMessage: (text: string, messageID: string) => Promise<void>;
	forwardAttachment: (
		attachmentID: string,
		threadIDs: string | string[]
	) => void;
	getAppState: () => Cookie[];
	getCurrentUserID: () => string;
	getEmojiUrl: (c: string, size: number, pixelRatio?: number) => string;
	getFriendsList: (
		limit?: number,
		cursor?: string
	) => Promise<
		Array<{
			fullName: string;
			firstName: string;
			gender: string;
			userID: string;
			isFriend: boolean;
			profilePicture: string;
			type: string;
			profileUrl: string;
			vanity: string | null;
			commonFriends: number;
		}>
	>;
	getMessage: (threadID: string, messageID: string) => Promise<any>;
	getThreadHistory: (
		threadID: string,
		amount: number,
		timestamp?: string
	) => Promise<any[]>;
	getThreadInfo: (threadIDs: string | string[]) => Promise<GetThreadInfoResult>;
	getThreadList: (
		limit: number,
		timestamp: number | null,
		tags: string[]
	) => Promise<any[]>;
	getThreadPictures: (
		threadID: string,
		offset: number,
		limit: number
	) => Promise<any[]>;
	getTotalNumberFriends: () => Promise<{ total: number; list: any[] }>;
	getUserID: (name: string) => Promise<
		Array<{
			userID: string;
			photoUrl: string;
			indexRank: number;
			name: string;
			isVerified: boolean;
			profileUrl: string;
			category: string;
			score: number;
			type: string;
		}>
	>;
	getUserInfo: (id: string | string[]) => Promise<
		Record<
			string,
			{
				name: string;
				firstName: string;
				vanity: string;
				thumbSrc: string;
				profileUrl: string;
				gender: number;
				type: string;
				isFriend: boolean;
				isBirthday: boolean;
			}
		>
	>;
	handleFriendRequest: (userID: string, accept: boolean) => Promise<any>;
	handleMessageRequest: (
		threadIDs: string | string[],
		accept: boolean
	) => Promise<boolean>;
	httpGet: (
		url: string,
		form?: any,
		customHeader?: Record<string, string>,
		notAPI?: boolean
	) => Promise<string>;
	httpPost: (
		url: string,
		form?: any,
		customHeader?: Record<string, string>,
		notAPI?: boolean
	) => Promise<string>;
	httpPostFormData: (
		url: string,
		form?: any,
		customHeader?: Record<string, string>,
		notAPI?: boolean
	) => Promise<string>;
	listenMqtt(callback?: ListenMqttCallback): ListenMqttEmitter;
	logout: (callback?: (err: Error | null) => void) => void;
	markAsDelivered: (
		threadID: string,
		messageID: string,
		callback?: Function
	) => void;
	markAsRead: (threadID: string, callback?: Function) => void;
	markAsReadAll: (callback?: Function) => void;
	markAsSeen: (callback?: Function) => void;
	muteThread: (threadID: string, muteSeconds: number) => Promise<boolean>;
	removeUserFromGroup: (threadID: string, userID: string) => Promise<boolean>;
	resolvePhotoUrl: (
		photoID: string,
		callback: (err: Error | null, url: string) => void
	) => void;
	searchForThread: (
		name: string,
		callback: (err: Error | null, threadID: string) => void
	) => void;
	sendMessage: (
		msg: string | MessageOptions,
		threadID: ThreadID,
		replyToMessage?: string,
		isGroup?: boolean
	) => Promise<MessageResponse>;
	sendTypingIndicator: (threadID: string, callback?: Function) => void;
	setMessageReaction: (
		reaction: string,
		messageID: string,
		forceCustomReaction?: boolean
	) => Promise<boolean>;
	setPostReaction: (
		postID: string,
		reaction: string,
		callback?: Function
	) => void;
	setTitle: (threadID: string, title: string, callback?: Function) => void;
	threadColors: Record<string, string>;
	unfriend: (userID: string) => Promise<boolean>;
	unsendMessage: (messageID: string) => Promise<void>;
	uploadAttachment: (readStream: any) => Promise<string>;
}

declare module "fb-chat-api" {
	import { EventEmitter } from "events";
	import { Jar } from "request";

	// ============ CORE INTERFACES ============
	interface Credentials {
		appState: Cookie[];
	}

	interface LoginOptions {
		forceLogin?: boolean;
		userAgent?: string;
		logLevel?:
			| "error"
			| "warn"
			| "info"
			| "http"
			| "verbose"
			| "debug"
			| "silly";
		selfListen?: boolean;
		listenEvents?: boolean;
		pageID?: string;
		online?: boolean;
		emitReady?: boolean;
		autoMarkDelivery?: boolean;
		autoMarkRead?: boolean;
		proxy?: string;
		region?: string;
		updatePresence?: boolean;
	}

	interface Context {
		userID: string;
		jar: Jar;
		clientID: string;
		globalOptions: LoginOptions;
		loggedIn: boolean;
		access_token: string;
		clientMutationId: number;
		mqttClient?: any;
		syncToken?: string;
		lastSeqId?: string;
		reqCounter: number;
		reqCallbacks: Record<number, Function>;
		i_userID?: string;
	}

	// ============ EVENT TYPES ============
	interface Message {
		body: string;
		senderID: string;
		threadID: string;
		messageID: string;
		attachments: Attachment[];
		timestamp: string;
	}

	interface Attachment {
		type:
			| "photo"
			| "animated_image"
			| "video"
			| "file"
			| "audio"
			| "sticker"
			| "share";
		ID?: string;
		filename?: string;
		url?: string;
		duration?: number;
		previewUrl?: string;
		title?: string;
		description?: string;
	}

	interface Event {
		type: "event";
		logMessageType: string;
		logMessageData: any;
		threadID: string;
		author: string;
	}

	interface PresenceEvent {
		type: "presence";
		userID: string;
		statuses: any;
		timestamp: number;
	}

	interface TypingEvent {
		type: "typ";
		isTyping: boolean;
		from: string;
		threadID: string;
	}

	// ============ MAIN FUNCTION ============
	function login(
		credentials: Credentials,
		options: LoginOptions,
		callback: (err: Error | null, api: FacebookChatAPI) => void
	): void;

	function login(
		credentials: Credentials,
		callback: (err: Error | null, api: FacebookChatAPI) => void
	): void;

	async function loginAsync(
		credentials: Credentials,
		options?: LoginOptions
	): Promise<FacebookChatAPI>;

	// export = login;
	export as namespace login;
	export = {
		login,
		loginAsync
	};
}

export { FacebookChatAPI };
