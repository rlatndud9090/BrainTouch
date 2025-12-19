import Phaser from 'phaser';
import { digitRecognizer } from '../utils/DigitRecognizer';

// 색상 상수
const COLORS = {
  BG_PRIMARY: 0x1a1a2e,
  BG_SECONDARY: 0x16213e,
  BUTTON_KEYPAD: 0x4ecca3,
  BUTTON_HANDWRITING: 0xffc947,
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#a0a0a0',
};

export type GameMode = 'keypad' | 'handwriting';

export class ModeSelectScene extends Phaser.Scene {
  private isModelLoading = false;
  private modelLoaded = false;
  private loadingText?: Phaser.GameObjects.Text; // 필기 모드 비활성화로 optional

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
      height * 0.5, // 중앙 배치
      '🔢 숫자패드',
      '빠르고 정확한 입력',
      COLORS.BUTTON_KEYPAD,
      () => this.startGame('keypad')
    );

    // TODO: 필기 인식률 개선 후 다시 활성화
    // // 필기 모드 버튼
    // this.createModeButton(
    //   width / 2,
    //   height * 0.62,
    //   '✏️ 필기 입력',
    //   '손글씨로 숫자 입력',
    //   COLORS.BUTTON_HANDWRITING,
    //   () => this.handleHandwritingSelect()
    // );

    // // 모델 로딩 상태 텍스트
    // this.loadingText = this.add
    //   .text(width / 2, height * 0.78, '', {
    //     fontSize: '14px',
    //     fontFamily: 'Pretendard, sans-serif',
    //     color: COLORS.TEXT_SECONDARY,
    //   })
    //   .setOrigin(0.5)
    //   .setAlpha(0);

    // 홈 버튼
    this.createHomeButton(width);

    // TODO: 필기 모드 활성화 시 주석 해제
    // // 모델 사전 로딩 시작 (백그라운드)
    // this.preloadModel();
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

  private async preloadModel(): Promise<void> {
    if (this.modelLoaded || this.isModelLoading) return;

    this.isModelLoading = true;

    try {
      const success = await digitRecognizer.loadModel();
      this.modelLoaded = success;
    } catch (error) {
      console.error('모델 로딩 실패:', error);
      this.modelLoaded = false;
    }

    this.isModelLoading = false;
  }

  private async handleHandwritingSelect(): Promise<void> {
    if (this.modelLoaded) {
      this.startGame('handwriting');
      return;
    }

    // 모델이 아직 로딩 중이면 대기
    if (this.isModelLoading) {
      this.showLoadingMessage('AI 모델 로딩 중...');

      // 로딩 완료 대기
      while (this.isModelLoading) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (this.modelLoaded) {
        this.startGame('handwriting');
      } else {
        this.showLoadingMessage('모델 로딩 실패. 숫자패드 모드를 이용해주세요.');
      }
      return;
    }

    // 모델 로딩 시도
    this.showLoadingMessage('AI 모델 로딩 중...');
    const success = await digitRecognizer.loadModel();
    this.modelLoaded = success;

    if (success) {
      this.startGame('handwriting');
    } else {
      this.showLoadingMessage('모델 로딩 실패. 숫자패드 모드를 이용해주세요.');
    }
  }

  private showLoadingMessage(message: string): void {
    this.loadingText?.setText(message);
    this.loadingText?.setAlpha(1);
  }

  private startGame(mode: GameMode): void {
    if (mode === 'keypad') {
      this.scene.start('GameScene');
    } else {
      this.scene.start('GameSceneHW');
    }
  }
}
