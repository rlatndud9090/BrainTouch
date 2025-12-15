import Phaser from 'phaser';

// 색상 상수
const COLORS = {
  BG_SPACE: 0x0a0a1a,
  ACCENT_CYAN: 0x00d4ff,
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#a0a0a0',
  BUTTON_PRIMARY: 0x00d4ff,
  BUTTON_SECONDARY: 0x3a3a5e,
};

interface ResultData {
  totalScore: number;
  survivalTime: number;
  maxPower: number;
  turnCount: number;
}

export class ResultScene extends Phaser.Scene {
  private totalScore = 0;
  private survivalTime = 0;
  private maxPower = 0;
  private turnCount = 0;

  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data: ResultData): void {
    this.totalScore = data.totalScore || 0;
    this.survivalTime = data.survivalTime || 0;
    this.maxPower = data.maxPower || 0;
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
      .text(width / 2, height * 0.12, '🚀 비행 종료!', {
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
      .text(width / 2, height * 0.33, `${this.totalScore}`, {
        fontSize: '64px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#00d4ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // 상세 정보
    const infoY = height * 0.48;
    const infoGap = 35;

    this.createInfoRow(width / 2, infoY, '생존 시간', this.formatTime(this.survivalTime));
    this.createInfoRow(width / 2, infoY + infoGap, '최고 파워', `${this.maxPower}`);
    this.createInfoRow(width / 2, infoY + infoGap * 2, '클리어 턴', `${this.turnCount}`);

    // 버튼들
    this.createButton(
      width / 2,
      height * 0.72,
      '다시 도전',
      () => {
        this.scene.start('GameScene');
      },
      COLORS.BUTTON_PRIMARY
    );

    this.createButton(
      width / 2,
      height * 0.84,
      '홈으로',
      () => {
        this.game.events.emit('gameOver', {
          totalScore: this.totalScore,
          survivalTime: this.survivalTime,
          maxPower: this.maxPower,
          turnCount: this.turnCount,
        });
      },
      COLORS.BUTTON_SECONDARY
    );
  }

  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}분 ${remainingSeconds}초`;
    }
    return `${seconds}초`;
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

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    bgColor: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const buttonWidth = 200;
    const buttonHeight = 50;

    const bg = this.add
      .rectangle(0, 0, buttonWidth, buttonHeight, bgColor, 1)
      .setStrokeStyle(2, 0x5a5a7e);
    bg.setInteractive({ useHandCursor: true });

    const text = this.add
      .text(0, 0, label, {
        fontSize: '20px',
        fontFamily: 'Pretendard, sans-serif',
        color: bgColor === COLORS.BUTTON_PRIMARY ? '#0a0a1a' : COLORS.TEXT_PRIMARY,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    container.add([bg, text]);

    bg.on('pointerover', () => {
      bg.setFillStyle(bgColor === COLORS.BUTTON_PRIMARY ? 0x33e0ff : 0x4a4a6e);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor);
    });

    bg.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        onComplete: onClick,
      });
    });

    return container;
  }
}
