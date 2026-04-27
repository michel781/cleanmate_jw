// ============================================================
// CleanMate — Application Types
// ============================================================

export type RoomState = 'clean' | 'ok' | 'dirty' | 'critical';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export type ActivityType =
  | 'task_added'
  | 'task_deleted'
  | 'task_edited'
  | 'request'
  | 'approved'
  | 'rejected'
  | 'party_created'
  | 'member_joined'
  | 'badge_earned'
  | 'streak_milestone';

export type CharacterColor =
  | 'brown' | 'white' | 'black' | 'pink' | 'gray' | 'caramel' | 'lavender' | 'mint';
export type CharacterHat =
  | 'none' | 'beanie' | 'beret' | 'cap' | 'crown' | 'bunny' | 'headphones';
export type CharacterShirt =
  | 'none' | 'stripe' | 'hoodie' | 'overalls' | 'cardigan' | 'pajamas' | 'suit';
export type CharacterAccessory =
  | 'none' | 'scarf' | 'glasses' | 'ribbon' | 'flower';

export interface Appearance {
  color?: CharacterColor;
  hat?: CharacterHat;
  shirt?: CharacterShirt;
  accessory?: CharacterAccessory;
}

export type SofaVariant = 'small' | 'large' | 'beanbag';
export type RugVariant = 'round' | 'square' | 'nordic';
export type PlantVariant = 'monstera' | 'cactus' | 'succulent' | 'tree' | 'herb';
export type TableVariant = 'round' | 'square' | 'low';
export type BookshelfVariant = 'rect' | 'l-shape';
export type RoomExtra = 'fishbowl' | 'catbed' | 'console' | 'whiteboard' | 'calendar';

export interface RoomLayout {
  sofa?: SofaVariant;
  rug?: RugVariant;
  plants?: PlantVariant[];
  table?: TableVariant;
  bookshelf?: BookshelfVariant;
  extras?: RoomExtra[];
}

export interface Profile {
  id: string;
  name: string;
  emoji: string;
  onboarded: boolean;
  appearance?: Appearance;
  room_layout?: RoomLayout;
  created_at: string;
  updated_at: string;
}

export interface Party {
  id: string;
  name: string;
  invite_code: string;
  created_by: string | null;
  created_at: string;
}

export interface PartyMember {
  party_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  profile?: Profile;  // joined
}

export interface Task {
  id: string;
  party_id: string;
  name: string;
  emoji: string;
  cycle: number;        // days
  weight: number;       // importance (5-15)
  assigned_to: string | null;  // null = both
  last_done_at: string | null;
  last_done_by: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TaskWithDaysSince extends Task {
  daysSince: number;
  isOverdue: boolean;
}

export interface Verification {
  id: string;
  task_id: string;
  party_id: string;
  requested_by: string;
  photo_url: string | null;
  photo_placeholder: string | null;
  status: VerificationStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  reject_reason: string | null;
  requested_at: string;

  // joined
  task?: Task;
  requester?: Profile;
}

export interface Score {
  party_id: string;
  user_id: string;
  score: number;
  updated_at: string;
}

export interface Streak {
  party_id: string;
  current: number;
  longest: number;
  last_active_date: string | null;
  freezes: number;
  updated_at: string;
}

export interface Activity {
  id: string;
  party_id: string;
  type: ActivityType;
  actor_id: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;

  // joined
  actor?: Profile;
}

export interface UserBadge {
  user_id: string;
  badge_id: string;
  party_id: string | null;
  earned_at: string;
}

export interface NotificationSettings {
  user_id: string;
  enabled: boolean;
  verification_requests: boolean;
  task_reminders: boolean;
  streak_reminders: boolean;
  party_updates: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;  // HH:MM
  quiet_hours_end: string;
  updated_at: string;
}

export interface UserTotals {
  user_id: string;
  requested_count: number;
  approved_count: number;
  rejected_count: number;
  updated_at: string;
}

// ============================================================
// UI-only types
// ============================================================

export interface LevelInfo {
  level: number;
  title: string;
  currentXP: number;
  requiredXP: number | null;  // null = max level
  nextThreshold: number | null;
}

export interface BadgeDefinition {
  id: string;
  icon: string;
  name: string;
  desc: string;
}
