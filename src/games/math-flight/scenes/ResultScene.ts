import Phaser from 'phaser';
import { BASE_COLORS } from '../../../shared/colors';
import { createButton } from '../../../shared/ui';
import { FONTS } from '../../../shared/constants';

// 색상 상수
const COLORS = {
  BG_SPACE: 0x0a0a1a,
  ACCENT_CYAN: '#00d4ff',
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#a0a0a0',
  BUTTON_PRIMARY: 0x00d4ff,
  BUTTON_SECONDARY: 0x3a3a5e,
};

interface ResultData {
  totalScore: number;
  survivalTime: number;
  turnCount: number;
}

export class ResultScene extends Phaser.Scene {
  private totalScore = 0;
  private survivalTime = 0;
  private turnCount = 0;

  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data: ResultData): void {
    this.totalScore = data.totalScore || 0;
    this.survivalTime = data.survivalTime || 0;
    this.turnCount = data.turnCount || 0;
  }

  create(): void {
    const { width, height } = this.scale;

    // 배경
    this.add.rectangle(0, 0, width, height, COLORS.BG_SPACE).setOrigin(0, 0);

    // 별 효과
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 1;
      const alpha = Math.random() * 0.5 + 0.3;
      this.add.circle(x, y, size, 0xffffff, alpha);
    }

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
      .text(width / 2, height * 0.48, `${this.totalScore}`, {
        fontSize: '72px',
        fontFamily: FONTS.NUMBER,
        color: COLORS.ACCENT_CYAN,
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
        bgColor: COLORS.BUTTON_PRIMARY,
        hoverColor: 0x33e0ff,
        textColor: '#0a0a1a',
        width: 200,
        height: 54,
      }
    );

    createButton(
      this,
      width / 2,
      height * 0.82,
      '홈으로',
      () => {
        this.game.events.emit('gameOver', {
          totalScore: this.totalScore,
          survivalTime: this.survivalTime,
          turnCount: this.turnCount,
        });
      },
      {
        bgColor: COLORS.BUTTON_SECONDARY,
        hoverColor: BASE_COLORS.BUTTON_HOVER,
        width: 200,
        height: 54,
      }
    );
  }
}
