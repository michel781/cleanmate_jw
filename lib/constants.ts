import type { BadgeDefinition } from '@/types/app';

export const DAY_MS = 24 * 60 * 60 * 1000;

// ============================================================
// Theme tokens for room states
// ============================================================
export const THEME = {
  clean: {
    wall: '#F3E4CC', wallTop: '#F8EDDB',
    floor: '#C89C6E', floorShadow: '#A67C52',
    accent: '#D4824A', accentDark: '#A35A2B',
    text: '#3D2817', particle: '#F5D98A',
    mood: '맑음', moodEmoji: '☀️',
  },
  ok: {
    wall: '#E5D5BC', wallTop: '#ECDEC7',
    floor: '#9C7855', floorShadow: '#7A5C3E',
    accent: '#8B6F4E', accentDark: '#5C4A33',
    text: '#3D2817', particle: '#B8A586',
    mood: '흐림', moodEmoji: '⛅',
  },
  dirty: {
    wall: '#8B7560', wallTop: '#9E8770',
    floor: '#5C4433', floorShadow: '#3D2B1E',
    accent: '#C46E52', accentDark: '#8B3A20',
    text: '#F5E6D3', particle: '#6B5441',
    mood: '비', moodEmoji: '🌧️',
  },
  critical: {
    wall: '#3D2B1E', wallTop: '#4A3626',
    floor: '#251810', floorShadow: '#0F0905',
    accent: '#D4736A', accentDark: '#8B3A3A',
    text: '#F5D5D5', particle: '#4A3626',
    mood: '천둥번개', moodEmoji: '⛈️',
  },
} as const;

// ============================================================
// UI option sets
// ============================================================
export const AVATAR_EMOJIS = [
  '🐻', '🐰', '🐱', '🐶', '🦊', '🐼', '🐨', '🦁',
  '🐯', '🐵', '🐸', '🦉', '🦄', '🐧', '🐙', '🦦',
];

export const TASK_EMOJIS = [
  '🍽️', '🚿', '🧹', '👕', '♻️', '🛏️', '🪴', '🗑️',
  '🧽', '🪟', '🧺', '🚪', '🧼', '🍳', '🪑', '📚',
];

export const CYCLE_OPTIONS = [
  { value: 1, label: '매일' },
  { value: 2, label: '이틀마다' },
  { value: 3, label: '3일마다' },
  { value: 5, label: '5일마다' },
  { value: 7, label: '매주' },
  { value: 14, label: '격주' },
  { value: 30, label: '매월' },
] as const;

export const WEIGHT_OPTIONS = [
  { value: 5, label: '낮음' },
  { value: 10, label: '보통' },
  { value: 15, label: '높음' },
] as const;

export const REJECT_REASONS = [
  '아직 덜 된 것 같아요',
  '사진이 잘 안 보여요',
  '다른 부분도 해줘요',
  '직접 말할게요',
] as const;

// ============================================================
// Level system
// ============================================================
export const LEVEL_THRESHOLDS = [0, 50, 150, 350, 700, 1500, 3000, 5000];
export const LEVEL_TITLES = [
  '청소 새싹', '청소 초보', '청소 견습', '청소 숙련',
  '청소 전문가', '청소 마스터', '청소 전설', '청소의 신',
];

// ============================================================
// Character customization
// ============================================================
export const CHARACTER_COLORS = [
  { id: 'brown',    label: '갈색 곰',   fill: '#D4824A', dark: '#A35A2B' },
  { id: 'white',    label: '흰 곰',     fill: '#F5E6D3', dark: '#C8B49A' },
  { id: 'black',    label: '검은 곰',   fill: '#3D2817', dark: '#1A100A' },
  { id: 'pink',     label: '분홍 곰',   fill: '#FFB6C1', dark: '#D88792' },
  { id: 'gray',     label: '회색 곰',   fill: '#A0A0A0', dark: '#6E6E6E' },
  { id: 'caramel',  label: '카라멜',    fill: '#C68642', dark: '#8E5C25' },
  { id: 'lavender', label: '라벤더',    fill: '#B19CD9', dark: '#7C6BAA' },
  { id: 'mint',     label: '민트',      fill: '#98D8B4', dark: '#5FA984' },
] as const;

export const CHARACTER_HATS = [
  { id: 'none',       label: '안 씀' },
  { id: 'beanie',     label: '비니' },
  { id: 'beret',      label: '베레모' },
  { id: 'cap',        label: '야구 모자' },
  { id: 'crown',      label: '왕관',     unlock: { kind: 'level', value: 5 } },
  { id: 'bunny',      label: '토끼 머리띠' },
  { id: 'headphones', label: '헤드폰' },
] as const;

export const CHARACTER_SHIRTS = [
  { id: 'none',     label: '기본' },
  { id: 'stripe',   label: '줄무늬 티' },
  { id: 'hoodie',   label: '후드티' },
  { id: 'overalls', label: '멜빵바지' },
  { id: 'cardigan', label: '가디건' },
  { id: 'pajamas',  label: '잠옷' },
  { id: 'suit',     label: '정장',     unlock: { kind: 'level', value: 7 } },
] as const;

export const CHARACTER_ACCESSORIES = [
  { id: 'none',    label: '없음' },
  { id: 'scarf',   label: '목도리' },
  { id: 'glasses', label: '안경' },
  { id: 'ribbon', label: '리본' },
  { id: 'flower', label: '꽃' },
] as const;

// ============================================================
// Room layout catalog
// ============================================================
export const ROOM_SOFAS = [
  { id: 'small',   label: '작은 소파' },
  { id: 'large',   label: '큰 소파',   unlock: { kind: 'cleanings', value: 10 } },
  { id: 'beanbag', label: '빈백',      unlock: { kind: 'cleanings', value: 30 } },
] as const;
export const ROOM_RUGS = [
  { id: 'round',   label: '원형' },
  { id: 'square',  label: '사각' },
  { id: 'nordic',  label: '북유럽 패턴', unlock: { kind: 'cleanings', value: 30 } },
] as const;
export const ROOM_PLANTS = [
  { id: 'monstera',  label: '몬스테라' },
  { id: 'cactus',    label: '선인장' },
  { id: 'succulent', label: '다육이' },
  { id: 'tree',      label: '꽃나무',  unlock: { kind: 'cleanings', value: 50 } },
  { id: 'herb',      label: '허브' },
] as const;
export const ROOM_TABLES = [
  { id: 'round',  label: '원형' },
  { id: 'square', label: '사각' },
  { id: 'low',    label: '낮은 테이블' },
] as const;
export const ROOM_BOOKSHELVES = [
  { id: 'rect',    label: '직사각' },
  { id: 'l-shape', label: 'L자',  unlock: { kind: 'cleanings', value: 50 } },
] as const;
export const ROOM_EXTRAS = [
  { id: 'fishbowl',   label: '어항',       unlock: { kind: 'cleanings', value: 50 } },
  { id: 'catbed',     label: '고양이 침대', unlock: { kind: 'cleanings', value: 30 } },
  { id: 'console',    label: '게임기',     unlock: { kind: 'cleanings', value: 50 } },
  { id: 'whiteboard', label: '화이트보드' },
  { id: 'calendar',   label: '캘린더' },
] as const;

// ============================================================
// Badges
// ============================================================
export const BADGES: BadgeDefinition[] = [
  { id: 'first_request',   icon: '🌱', name: '첫 걸음',        desc: '처음으로 인증 요청 보냄' },
  { id: 'first_approval',  icon: '🤝', name: '첫 협력',        desc: '파트너 인증을 처음 승인함' },
  { id: 'streak_7',        icon: '🔥', name: '일주일 전사',    desc: '7일 스트릭 달성' },
  { id: 'streak_30',       icon: '🏆', name: '한 달의 약속',    desc: '30일 스트릭 달성' },
  { id: 'cleanings_10',    icon: '⭐', name: '꾸준함의 시작',  desc: '인증 10회 완료' },
  { id: 'cleanings_50',    icon: '💯', name: '청소 익스퍼트',  desc: '인증 50회 완료' },
  { id: 'perfect_clean',   icon: '✨', name: '완벽주의자',     desc: '청결도 100 달성' },
  { id: 'late_night',      icon: '🌙', name: '야행성 청소러',  desc: '0-6시 사이 인증' },
];
