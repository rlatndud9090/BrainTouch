/**
 * 브레인터치 공통 색상 팔레트
 * 게임별 테마 색상은 각 게임에서 확장하여 사용
 */

// 기본 색상 (모든 게임 공통)
export const BASE_COLORS = {
  // 배경
  BG_PRIMARY: 0x1a1a2e,
  BG_SECONDARY: 0x16213e,
  BG_DARK: 0x0a0a1a,

  // 텍스트
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#a0a0a0',
  TEXT_DIM: '#606080',

  // 버튼
  BUTTON_SECONDARY: 0x3a3a5e,
  BUTTON_HOVER: 0x4a4a6e,
  STROKE: 0x5a5a7e,

  // 상태
  SUCCESS: 0x4ecca3,
  DANGER: 0xe94560,
  WARNING: 0xffc947,
  INFO: 0x00d4ff,
} as const;

// 게임별 테마 색상 프리셋
export const THEME_PRESETS = {
  // Brain Touch - 핑크/레드 계열
  brainTouch: {
    accent: 0xe94560,
    accentHover: 0xf25672,
    accentText: '#e94560',
    circleColors: [0xe94560, 0xff6b8a, 0xc73e54, 0xff4757, 0xee5a70],
  },

  // Speed Math - 녹색 계열
  speedMath: {
    accent: 0x4ecca3,
    accentHover: 0x3dbb92,
    accentText: '#4ecca3',
  },

  // Math Flight - 시안 계열
  mathFlight: {
    accent: 0x00d4ff,
    accentHover: 0x33e0ff,
    accentText: '#00d4ff',
  },

  // Block Sum - 노란 계열
  blockSum: {
    accent: 0xffc947,
    accentHover: 0xffda6a,
    accentText: '#ffc947',
  },
} as const;
