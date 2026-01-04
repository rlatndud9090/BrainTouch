/**
 * 브레인터치 공통 상수
 */

// 게임 화면 설정
export const GAME_LAYOUT = {
  /** 게임 화면 최대 너비 (대화면 폰 대응) */
  MAX_WIDTH: 560,
} as const;

/**
 * Device Pixel Ratio 계산
 * - 모바일 고해상도 디스플레이 지원
 * - 최대 2배로 제한 (성능 고려)
 */
export function getDevicePixelRatio(): number {
  return Math.min(window.devicePixelRatio || 1, 2);
}

/**
 * 고해상도 스케일 설정 생성
 * - DPR 배율로 렌더링 후 zoom으로 원래 크기에 맞춤
 * - 모바일에서 선명한 화면 제공
 */
export function createHighResScale(
  parentWidth: number,
  parentHeight: number
): {
  mode: number;
  width: number;
  height: number;
  zoom: number;
  autoCenter: number;
} {
  const dpr = getDevicePixelRatio();
  const logicalWidth = Math.min(parentWidth, GAME_LAYOUT.MAX_WIDTH);
  const logicalHeight = parentHeight;

  // Phaser.Scale 상수값 직접 사용 (import 순환 방지)
  return {
    mode: 2, // Phaser.Scale.FIT
    width: logicalWidth * dpr,
    height: logicalHeight * dpr,
    zoom: 1 / dpr,
    autoCenter: 1, // Phaser.Scale.CENTER_BOTH
  };
}

// 폰트 설정
export const FONTS = {
  /** 숫자 전용 폰트 (Cherry Bomb One - 깜찍한 느낌) */
  NUMBER: '"Cherry Bomb One", cursive',
  /** 기본 한글 폰트 */
  DEFAULT: 'Pretendard, sans-serif',
} as const;

/**
 * Cherry Bomb One 폰트 로딩 완료 대기
 * - 게임 시작 전 폰트가 완전히 로드되었는지 확인
 * - 폰트가 로드되지 않으면 숫자가 이상하게 표시되는 문제 방지
 */
export async function waitForFonts(): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }
}

