// types/getThreadInfoGraphQL.d.ts

export interface EventReminderMember {
	memberID: string;
	state: string;
}

export interface EventReminder {
	reminderID: string;
	eventCreatorID: string;
	time: number;
	eventType: string;
	locationName: string;
	locationCoordinates: any;
	locationPage: any;
	eventStatus: string;
	note: string;
	repeatMode: string;
	eventTitle: string;
	triggerMessage: string;
	secondsToNotifyBefore: number;
	allowsRsvp: boolean;
	relatedEvent: any;
	members: EventReminderMember[];
}

export interface UserInfo {
	id: string;
	name: string;
	firstName: string;
	vanity: string | null;
	url: string | null;
	thumbSrc: string | null;
	profileUrl: string | null;
	/**
	 * the gender of the user, with `1` is Female, `2` is Male, `0` is unknown
	 */
	gender: number;
	type: "User" | string;
	isFriend: boolean;
	isBirthday: boolean;
}

export interface InviteLink {
	enable: boolean;
	link: string | null;
}

export interface AdminID {
	id: string;
}

export interface ApprovalQueueEntry {
	inviterID: string;
	requesterID: string;
	timestamp: number;
	request_source: any;
}

export interface ThreadTheme {
	id: string;
	fallback_color: string;
	accessibility_label: string;
	reverse_gradients_for_radial: boolean;
	gradient_colors: string[];
	reaction_pack: any;
}

export interface ThreadInfo {
	threadID: string;
	threadName: string;
	participantIDs: string[];
	userInfo: UserInfo[];
	unreadCount: number;
	messageCount: number;
	timestamp: number;
	muteUntil: number | null;
	isGroup: boolean;
	isSubscribed: boolean;
	isArchived: boolean;
	folder: "INBOX" | "ARCHIVED" | "PENDING" | "OTHER";
	cannotReplyReason: string | null;
	eventReminders: EventReminder[] | null;
	emoji: string | null;
	color: string | null;
	threadTheme: ThreadTheme | null;
	nicknames: Record<string, string>;
	adminIDs: AdminID[];
	approvalMode: boolean;
	approvalQueue: ApprovalQueueEntry[];
	reactionsMuteMode: string;
	mentionsMuteMode: string;
	isPinProtected: boolean;
	relatedPageThread: any;
	name: string;
	snippet: string | null;
	snippetSender: string | null;
	snippetAttachments: any[];
	serverTimestamp: number;
	imageSrc: string | null;
	isCanonicalUser: boolean;
	isCanonical: boolean;
	recipientsLoadable: boolean;
	hasEmailParticipant: boolean;
	readOnly: boolean;
	canReply: boolean;
	lastMessageTimestamp: number | null;
	lastMessageType: string;
	lastReadTimestamp: number | null;
	threadType: number;
	inviteLink: InviteLink;
}

export type GetThreadInfoResult = Record<string, ThreadInfo>;

export type GetThreadInfoGraphQL = (
	threadIDs: string | string[]
) => Promise<GetThreadInfoResult>;
