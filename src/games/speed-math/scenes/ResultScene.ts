import Phaser from 'phaser';

// 색상 상수
const COLORS = {
  BG_PRIMARY: 0x1a1a2e,
  BG_SECONDARY: 0x16213e,
  ACCENT_GREEN: 0x4ecca3,
  ACCENT_YELLOW: 0xffc947,
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#a0a0a0',
  BUTTON_BG: 0x4ecca3,
  BUTTON_HOVER: 0x3dbb92,
};

interface ResultData {
  totalTime: number;
}

export class ResultScene extends Phaser.Scene {
  private totalTime = 0;

  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data: ResultData): void {
    this.totalTime = data.totalTime || 0;
  }

  create(): void {
    const { width, height } = this.scale;

    // 배경
    const bg = this.add.graphics();
    bg.fillGradientStyle(
      COLORS.BG_PRIMARY,
      COLORS.BG_PRIMARY,
      COLORS.BG_SECONDARY,
      COLORS.BG_SECONDARY
    );
    bg.fillRect(0, 0, width, height);

    // 결과 타이틀
    this.add
      .text(width / 2, height * 0.2, '🎉 완료!', {
        fontSize: '48px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_PRIMARY,
      })
      .setOrigin(0.5);

    // 기록 시간 라벨
    this.add
      .text(width / 2, height * 0.35, '기록', {
        fontSize: '24px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5);

    // 기록 시간
    const timeSeconds = (this.totalTime / 1000).toFixed(2);
    this.add
      .text(width / 2, height * 0.45, `${timeSeconds}초`, {
        fontSize: '72px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#4ecca3',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // 다시하기 버튼
    this.createButton(
      width / 2,
      height * 0.65,
      '다시 도전',
      () => {
        this.scene.start('GameScene');
      },
      COLORS.BUTTON_BG
    );

    // 홈으로 버튼
    this.createButton(
      width / 2,
      height * 0.78,
      '홈으로',
      () => {
        // React에 게임 종료 이벤트 전달
        this.game.events.emit('gameOver', {
          totalTime: this.totalTime,
        });
      },
      0x3a3a5e
    );

    // 리사이즈 대응
    this.scale.on('resize', this.handleResize, this);
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

    // 버튼 배경
    const bg = this.add
      .rectangle(0, 0, buttonWidth, buttonHeight, bgColor, 1)
      .setStrokeStyle(2, 0x5a5a7e);
    bg.setInteractive({ useHandCursor: true });

    // 버튼 텍스트
    const text = this.add
      .text(0, 0, label, {
        fontSize: '22px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_PRIMARY,
      })
      .setOrigin(0.5);

    container.add([bg, text]);

    // 호버 효과
    bg.on('pointerover', () => {
      bg.setFillStyle(bgColor === COLORS.BUTTON_BG ? 0x3dbb92 : 0x4a4a6e);
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

  private handleResize(_gameSize: Phaser.Structs.Size): void {
    // 필요 시 리사이즈 로직 추가
  }
}
