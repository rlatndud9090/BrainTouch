import Phaser from 'phaser';

// 색상 상수
const COLORS = {
  BG_PRIMARY: 0x1a1a2e,
  BG_SECONDARY: 0x16213e,
  BUTTON_KEYPAD: 0x4ecca3,
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#a0a0a0',
};

export class ModeSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ModeSelectScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // 배경
    this.createBackground(width, height);

    // 타이틀
    this.add
      .text(width / 2, height * 0.15, '스피드 계산', {
        fontSize: '36px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_PRIMARY,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.22, '입력 방식을 선택하세요', {
        fontSize: '18px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5);

    // 숫자패드 모드 버튼 (현재 유일하게 활성화된 모드)
    this.createModeButton(
      width / 2,
      height * 0.5,
      '🔢 숫자패드',
      '빠르고 정확한 입력',
      COLORS.BUTTON_KEYPAD,
      () => this.startGame()
    );

    // 홈 버튼
    this.createHomeButton(width);
  }

  private createBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(
      COLORS.BG_PRIMARY,
      COLORS.BG_PRIMARY,
      COLORS.BG_SECONDARY,
      COLORS.BG_SECONDARY
    );
    bg.fillRect(0, 0, width, height);
  }

  private createModeButton(
    x: number,
    y: number,
    title: string,
    description: string,
    color: number,
    onClick: () => void
  ): void {
    const { width } = this.scale;
    const buttonWidth = Math.min(width * 0.8, 280);
    const buttonHeight = 80;

    const container = this.add.container(x, y);

    // 버튼 배경
    const bg = this.add
      .rectangle(0, 0, buttonWidth, buttonHeight, color, 1)
      .setStrokeStyle(2, 0xffffff, 0.3);
    bg.setInteractive({ useHandCursor: true });

    // 타이틀
    const titleText = this.add
      .text(0, -12, title, {
        fontSize: '22px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#1a1a2e',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // 설명
    const descText = this.add
      .text(0, 14, description, {
        fontSize: '14px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#1a1a2e',
      })
      .setOrigin(0.5);

    container.add([bg, titleText, descText]);

    // 호버 효과
    bg.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 100,
      });
    });

    bg.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });

    bg.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.97,
        scaleY: 0.97,
        duration: 50,
        yoyo: true,
        onComplete: onClick,
      });
    });
  }

  private createHomeButton(width: number): void {
    const homeBtn = this.add
      .text(width / 2, this.scale.height * 0.9, '← 홈으로', {
        fontSize: '16px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    homeBtn.on('pointerover', () => {
      homeBtn.setColor('#ffffff');
    });

    homeBtn.on('pointerout', () => {
      homeBtn.setColor(COLORS.TEXT_SECONDARY);
    });

    homeBtn.on('pointerdown', () => {
      this.game.events.emit('gameOver', { totalTime: 0 });
    });
  }

  private startGame(): void {
    this.scene.start('GameScene');
  }
}
