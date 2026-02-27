/**
 * 결과 공유 유틸리티
 * - 1순위: Web Share API
 * - 2순위: 클립보드 복사 fallback
 */

const APP_TITLE = '브레인 터치 - 계산편';

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'unsupported';

export interface ShareGameResultInput {
  gameId: string;
  gameTitle: string;
  metricLabel: string;
  metricValue: string | number;
}

interface ShareFeedbackOptions {
  color: string;
}

function buildGameUrl(gameId: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}#/share/${encodeURIComponent(gameId)}`;
}

function buildShareText(input: ShareGameResultInput): string {
  return `${input.gameTitle}\n${input.metricLabel}: ${input.metricValue}\n${APP_TITLE}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareGameResult(input: ShareGameResultInput): Promise<ShareOutcome> {
  if (typeof navigator === 'undefined') {
    return 'unsupported';
  }

  const url = buildGameUrl(input.gameId);
  const text = buildShareText(input);
  const shareData: ShareData = {
    title: APP_TITLE,
    text,
    url,
  };

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(shareData);
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  const copied = await copyToClipboard(`${text}\n${url}`);
  return copied ? 'copied' : 'unsupported';
}

export function getShareOutcomeMessage(outcome: ShareOutcome): string | null {
  if (outcome === 'shared') return '공유 창이 열렸어요';
  if (outcome === 'copied') return '공유 문구를 복사했어요';
  if (outcome === 'unsupported') return '이 기기에서는 공유를 지원하지 않아요';
  return null;
}

export async function shareGameResultWithFeedback(
  input: ShareGameResultInput,
  onMessage: (message: string, options: ShareFeedbackOptions) => void
): Promise<ShareOutcome> {
  const outcome = await shareGameResult(input);
  const message = getShareOutcomeMessage(outcome);

  if (message) {
    onMessage(message, {
      color: outcome === 'unsupported' ? '#ff6b6b' : '#4ecca3',
    });
  }

  return outcome;
}
