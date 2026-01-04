/**
 * 브레인터치 공통 상수
 */

// 게임 화면 설정
export const GAME_LAYOUT = {
  /** 게임 화면 최대 너비 (대화면 폰 대응) */
  MAX_WIDTH: 560,
} as const;

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

