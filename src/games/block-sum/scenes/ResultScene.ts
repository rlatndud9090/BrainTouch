import Phaser from 'phaser';
import { BASE_COLORS, THEME_PRESETS } from '../../../shared/colors';
import { createGradientBackground, createButton, showToast } from '../../../shared/ui';
import { FONTS } from '../../../shared/constants';
import { shareGameResultWithFeedback } from '../../../shared/share';

// 게임 색상
const COLORS = {
  ...BASE_COLORS,
  ACCENT: THEME_PRESETS.blockSum.accent,
  ACCENT_TEXT: THEME_PRESETS.blockSum.accentText,
};

interface ResultData {
  score: number;
  clearedRounds: number;
  maxDifficulty: string;
}

export class ResultScene extends Phaser.Scene {
  private score = 0;
  private clearedRounds = 0;
  private maxDifficulty = '하';

  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data: ResultData): void {
    this.score = data.score || 0;
    this.clearedRounds = data.clearedRounds || 0;
    this.maxDifficulty = data.maxDifficulty || '하';
  }

  create(): void {
    const { width, height } = this.scale;

    // 배경
    createGradientBackground(this, width, height);

    // 타이틀
    this.add
      .text(width / 2, height * 0.18, '게임 종료', {
        fontSize: '40px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_PRIMARY,
      })
      .setOrigin(0.5);

    // 점수 라벨
    this.add
      .text(width / 2, height * 0.35, '점수', {
        fontSize: '24px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5);

    // 점수 (메인)
    this.add
      .text(width / 2, height * 0.48, `${this.score}`, {
        fontSize: '72px',
        fontFamily: FONTS.NUMBER,
        color: COLORS.ACCENT_TEXT,
      })
      .setOrigin(0.5);

    // 버튼들
    createButton(
      this,
      width / 2,
      height * 0.7,
      '다시 도전',
      () => {
        this.scene.start('GameScene');
      },
      {
        bgColor: COLORS.ACCENT,
        hoverColor: THEME_PRESETS.blockSum.accentHover,
        textColor: '#1a1a2e',
        width: 200,
        height: 54,
      }
    );

    createButton(
      this,
      width / 2,
      height * 0.8,
      '공유하기',
      () => {
        void shareGameResultWithFeedback(
          {
            gameId: 'block-sum',
            gameTitle: '블록셈',
            metricLabel: '점수',
            metricValue: this.score,
          },
          (message, options) => {
            showToast(this, message, options);
          }
        );
      },
      {
        bgColor: 0x5865f2,
        hoverColor: 0x6a75f4,
        textColor: '#ffffff',
        width: 200,
        height: 54,
        triggerOnPointerDown: true,
      }
    );

    createButton(
      this,
      width / 2,
      height * 0.9,
      '홈으로',
      () => {
        this.game.events.emit('gameOver', {
          score: this.score,
          clearedRounds: this.clearedRounds,
          maxDifficulty: this.maxDifficulty,
        });
      },
      {
        bgColor: COLORS.BUTTON_SECONDARY,
        hoverColor: COLORS.BUTTON_HOVER,
        width: 200,
        height: 54,
      }
    );
  }
}
