/**
 * 브레인터치 공통 색상 팔레트
 * 모든 게임에서 이 색상들을 사용
 */

// 기본 색상 (모든 게임 공통)
export const BASE_COLORS = {
  // 배경
  BG_PRIMARY: 0x1a1a2e,
  BG_SECONDARY: 0x16213e,
  BG_DARK: 0x0a0a1a,
  BG_SPACE: 0x0a0a1a, // Math Flight 우주 배경
  BG_SKY: 0x87ceeb, // Number Balloon 하늘 배경
  BG_SKY_BOTTOM: 0xb0e0e6,

  // 텍스트
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#a0a0a0',
  TEXT_DIM: '#606080',
  TEXT_DARK: '#2c3e50', // 밝은 배경용

  // 버튼
  BUTTON_PRIMARY: 0x4ecca3,
  BUTTON_PRIMARY_HOVER: 0x3dbb92,
  BUTTON_SECONDARY: 0x3a3a5e,
  BUTTON_HOVER: 0x4a4a6e,
  STROKE: 0x5a5a7e,

  // 상태
  SUCCESS: 0x4ecca3,
  DANGER: 0xe94560,
  WARNING: 0xffc947,
  INFO: 0x00d4ff,

  // 숫자패드
  PAD_BG: 0x2a2a4e,
  PAD_HOVER: 0x3a3a5e,

  // 레인/구분선
  LANE_LINE: 0x1a1a3a,

  // HUD
  HUD_BG: 0x2c3e50,
} as const;

// 공통 컬러풀 팔레트 (풍선, 블록, 원 등 다양한 곳에서 사용)
export const COLORFUL_PALETTE = [
  0xff69b4, // 핑크
  0x4fc3f7, // 하늘색
  0xff7043, // 주황
  0x81c784, // 초록
  0xef5350, // 빨강
  0xffee58, // 노랑
  0xba68c8, // 보라
  0x4dd0e1, // 민트
] as const;

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
    bgSpace: 0x0a0a1a,
    meteorNormal: 0x4a6fa5,
    player: 0x00d4ff,
    successFlash: 0x4ecca3,
    failFlash: 0xe94560,
    medianFlash: 0xffc947,
  },

  // Block Sum - 노란 계열
  blockSum: {
    accent: 0xffc947,
    accentHover: 0xffda6a,
    accentText: '#ffc947',
    blockBg: 0x2a2a4e,
    blockSelected: 0x4a4a6e,
  },

  // Number Balloon - 핑크 계열
  numberBalloon: {
    accent: 0xff69b4,
    accentHover: 0xff85c1,
    accentText: '#ff69b4',
    bgTop: 0x87ceeb,
    bgBottom: 0xb0e0e6,
  },
} as const;
