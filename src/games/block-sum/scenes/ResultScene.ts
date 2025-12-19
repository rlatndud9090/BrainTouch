import Phaser from 'phaser';
import { BASE_COLORS, THEME_PRESETS } from '../../../shared/colors';
import { createGradientBackground, createButton } from '../../../shared/ui';

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
      .text(width / 2, height * 0.12, '⏰ 시간 종료!', {
        fontSize: '40px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_PRIMARY,
      })
      .setOrigin(0.5);

    // 점수 (메인)
    this.add
      .text(width / 2, height * 0.25, '점수', {
        fontSize: '20px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.35, `${this.score}`, {
        fontSize: '72px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.ACCENT_TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // 상세 정보
    const infoY = height * 0.5;
    const infoGap = 40;

    this.createInfoRow(width / 2, infoY, '클리어 라운드', `${this.clearedRounds}`);
    this.createInfoRow(width / 2, infoY + infoGap, '최고 난이도', this.maxDifficulty);

    // 버튼들
    createButton(
      this,
      width / 2,
      height * 0.72,
      '다시 도전',
      () => {
        this.scene.start('GameScene');
      },
      {
        bgColor: COLORS.ACCENT,
        hoverColor: THEME_PRESETS.blockSum.accentHover,
        textColor: '#1a1a2e',
      }
    );

    createButton(
      this,
      width / 2,
      height * 0.84,
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
      }
    );

    // 리사이즈 대응
    this.scale.on('resize', this.handleResize, this);
  }

  private createInfoRow(x: number, y: number, label: string, value: string): void {
    this.add
      .text(x - 80, y, label, {
        fontSize: '18px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0, 0.5);

    this.add
      .text(x + 80, y, value, {
        fontSize: '20px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_PRIMARY,
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5);
  }

  private handleResize(_gameSize: Phaser.Structs.Size): void {
    // 필요 시 리사이즈 로직 추가
  }
}
