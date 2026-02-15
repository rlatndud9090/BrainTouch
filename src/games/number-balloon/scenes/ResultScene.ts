import Phaser from 'phaser';
import { BASE_COLORS } from '../../../shared/colors';
import { createButton, showToast } from '../../../shared/ui';
import { FONTS } from '../../../shared/constants';
import { shareGameResult, getShareOutcomeMessage } from '../../../shared/share';

// 게임 색상
const COLORS = {
  BG_TOP: 0x87ceeb,
  BG_BOTTOM: 0xb0e0e6,
  TEXT_DARK: '#2c3e50',
  TEXT_SECONDARY: '#7f8c8d',
  ACCENT: 0xff69b4,
  ACCENT_HOVER: 0xff85c1,
  ACCENT_TEXT: '#ff69b4',
};

interface ResultData {
  score: number;
  maxRound: number;
  totalPopped: number;
}

export class ResultScene extends Phaser.Scene {
  private score = 0;
  private maxRound = 0;
  private totalPopped = 0;

  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data: ResultData): void {
    this.score = data.score || 0;
    this.maxRound = data.maxRound || 1;
    this.totalPopped = data.totalPopped || 0;
  }

  private async shareResult(): Promise<void> {
    const outcome = await shareGameResult({
      gameId: 'number-balloon',
      gameTitle: '숫자풍선',
      metricLabel: '점수',
      metricValue: this.score,
    });

    const message = getShareOutcomeMessage(outcome);
    if (message) {
      showToast(this, message, {
        color: outcome === 'unsupported' ? '#ff6b6b' : '#4ecca3',
      });
    }
  }

  create(): void {
    const { width, height } = this.scale;

    // 배경
    const bg = this.add.graphics();
    bg.fillGradientStyle(COLORS.BG_TOP, COLORS.BG_TOP, COLORS.BG_BOTTOM, COLORS.BG_BOTTOM);
    bg.fillRect(0, 0, width, height);

    // 타이틀
    this.add
      .text(width / 2, height * 0.18, '게임 종료', {
        fontSize: '40px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_DARK,
        fontStyle: 'bold',
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
        hoverColor: COLORS.ACCENT_HOVER,
        textColor: '#ffffff',
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
        void this.shareResult();
      },
      {
        bgColor: 0x5865f2,
        hoverColor: 0x6a75f4,
        textColor: '#ffffff',
        width: 200,
        height: 54,
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
          maxRound: this.maxRound,
          totalPopped: this.totalPopped,
        });
      },
      {
        bgColor: BASE_COLORS.BUTTON_SECONDARY,
        hoverColor: BASE_COLORS.BUTTON_HOVER,
        width: 200,
        height: 54,
      }
    );
  }
}
