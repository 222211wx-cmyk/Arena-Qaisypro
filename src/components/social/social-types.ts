// ── Shared TypeScript interfaces for the Social Hub ───────────────────────────

export interface FeedPost {
  id: number;
  userId?: number;
  username: string;
  content: string;
  domain: string;
  type: string;
  likes: number;
  commentCount: number;
  imageUrl?: string;
  mediaType?: string;   // "image" | "video"
  createdAt: string;
  expiresAt?: string | null;
}

export interface Comment {
  id: number;
  postId: number;
  userId?: number;
  username: string;
  content: string;
  createdAt: string;
}

export interface DmRoom {
  id: number;
  name?: string;
  type: string;   // direct | group
  icon?: string;
  createdAt: string;
  members: {
    userId: number;
    username: string;
    lastReadAt?: string | null;
    solidarityStatus?: string | null;
    solidarityStatusVisible?: boolean;
  }[];
  lastMessage?: { content?: string; type: string; createdAt: string } | null;
  unreadCount: number;
  muted?: boolean;
  blocked?: boolean;
  blockedByMe?: boolean;
}

export interface GroupRoom {
  id: number;
  name?: string;
  type: string;
  icon?: string;
  memberCount?: number;
  activeInitiativeCount?: number;
}

export interface DmMessage {
  id: number;
  roomId: number;
  userId?: number;
  username: string;
  content?: string;
  audioUrl?: string;
  videoUrl?: string;
  fileUrl?: string;
  type: string;   // text | audio | file
  createdAt: string;
  expiresAt?: string | null;
  // Task #165 extensions
  replyToId?: number | null;
  replyTo?: { id: number; username: string; content?: string; type: string } | null;
  reactions?: { support: number; listen: number; celebrate: number };
  myReaction?: "support" | "listen" | "celebrate" | null;
  encrypted?: boolean;
  decryptionFailed?: boolean;
  secureAttachment?: {
    key: string;
    iv: string;
    mime: string;
    name: string;
    size: number;
    kind: "image" | "video" | "audio" | "file";
  };
}

export interface SolidarityStatus {
  status: "available" | "listening" | "seeking" | "focused" | "offline" | null;
  statusVisible: boolean;
}

export interface Story {
  id: number;
  username: string;
  content: string;
  imageUrl?: string;
  domain: string;
  likes: number;
  expiresAt: string;
  createdAt: string;
}

export interface Citizen {
  id: number;
  username: string;
  xp: number;
  balance: number;
  rank: { label: string; icon: string; color: string };
}

export interface CallRecord {
  id: number;
  callerId: number;
  callerUsername: string;
  calleeId?: number;
  calleeUsername: string;
  callType: string;   // audio | video
  status: string;     // answered | missed | ended
  durationSec: number;
  startedAt: string;
}

export interface NotifItem {
  id: number;
  type: string;       // comment | reaction | follow | call_missed
  username: string;
  content: string;
  postSnippet?: string;
  createdAt: string;
  isRead: boolean;
}

export interface SearchHit {
  posts:    { id: number; username: string; content: string; createdAt: string }[];
  citizens: { id: number; username: string; xp: number; rank: { label: string; icon: string; color: string } }[];
  stories:  { id: number; username: string; content: string; createdAt: string }[];
}
