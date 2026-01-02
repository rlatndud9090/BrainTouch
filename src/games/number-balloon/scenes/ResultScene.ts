import Phaser from 'phaser';
import { BASE_COLORS } from '../../../shared/colors';
import { createButton } from '../../../shared/ui';
import { FONTS } from '../../../shared/constants';

// 게임 색상
const COLORS = {
  BG_TOP: 0x87ceeb,
  BG_BOTTOM: 0xb0e0e6,
  TEXT_DARK: '#2c3e50',
  TEXT_SECONDARY: '#7f8c8d',
  ACCENT: 0xff69b4,
  ACCENT_HOVER: 0xff85c1,
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

  create(): void {
    const { width, height } = this.scale;

    // 배경
    const bg = this.add.graphics();
    bg.fillGradientStyle(COLORS.BG_TOP, COLORS.BG_TOP, COLORS.BG_BOTTOM, COLORS.BG_BOTTOM);
    bg.fillRect(0, 0, width, height);

    // 타이틀
    this.add
      .text(width / 2, height * 0.12, '🎈 게임 종료!', {
        fontSize: '40px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_DARK,
        fontStyle: 'bold',
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
        fontFamily: FONTS.NUMBER,
        color: '#ff69b4',
      })
      .setOrigin(0.5);

    // 상세 정보
    const infoY = height * 0.5;
    const infoGap = 40;

    this.createInfoRow(width / 2, infoY, '도달 라운드', `${this.maxRound}`);
    this.createInfoRow(width / 2, infoY + infoGap, '터뜨린 풍선', `${this.totalPopped}개`);

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
        hoverColor: COLORS.ACCENT_HOVER,
        textColor: '#ffffff',
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
          maxRound: this.maxRound,
          totalPopped: this.totalPopped,
        });
      },
      {
        bgColor: BASE_COLORS.BUTTON_SECONDARY,
        hoverColor: BASE_COLORS.BUTTON_HOVER,
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
        color: COLORS.TEXT_DARK,
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5);
  }

  private handleResize(_gameSize: Phaser.Structs.Size): void {
    // 필요 시 리사이즈 로직 추가
  }
}
