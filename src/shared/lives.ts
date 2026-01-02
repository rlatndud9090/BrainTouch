/**
 * 브레인터치 공통 목숨(라이프) 관리자
 * 하트 표시 UI + 목숨 상태 관리를 함께 처리
 */

import Phaser from 'phaser';

export interface LivesManagerOptions {
  x: number;
  y: number;
  maxLives?: number;
  heartSize?: number;
  spacing?: number;
  depth?: number;
  align?: 'left' | 'center' | 'right';
}

export class LivesManager {
  private scene: Phaser.Scene;
  private lives: number;
  private maxLives: number;
  private container: Phaser.GameObjects.Container;
  private heartTexts: Phaser.GameObjects.Text[] = [];

  // 설정
  private x: number;
  private y: number;
  private heartSize: number;
  private spacing: number;
  private align: 'left' | 'center' | 'right';

  constructor(scene: Phaser.Scene, options: LivesManagerOptions) {
    this.scene = scene;
    this.maxLives = options.maxLives ?? 3;
    this.lives = this.maxLives;
    this.x = options.x;
    this.y = options.y;
    this.heartSize = options.heartSize ?? 24;
    this.spacing = options.spacing ?? 8;
    this.align = options.align ?? 'center';

    // 컨테이너 생성
    this.container = scene.add.container(this.x, this.y);
    this.container.setDepth(options.depth ?? 100);

    // 초기 표시
    this.updateDisplay();
  }

  /**
   * 현재 목숨 수 반환
   */
  getLives(): number {
    return this.lives;
  }

  /**
   * 최대 목숨 수 반환
   */
  getMaxLives(): number {
    return this.maxLives;
  }

  /**
   * 게임 오버 여부 확인
   */
  isGameOver(): boolean {
    return this.lives <= 0;
  }

  /**
   * 목숨 1개 감소
   * @returns 게임 오버 여부 (true = 게임 오버)
   */
  loseLife(): boolean {
    if (this.lives > 0) {
      this.lives--;
      this.updateDisplay();
      this.playLoseAnimation();
    }
    return this.isGameOver();
  }

  /**
   * 목숨 1개 증가 (최대치 초과 불가)
   */
  gainLife(): void {
    if (this.lives < this.maxLives) {
      this.lives++;
      this.updateDisplay();
      this.playGainAnimation();
    }
  }

  /**
   * 목숨을 초기값으로 리셋
   */
  reset(): void {
    this.lives = this.maxLives;
    this.updateDisplay();
  }

  /**
   * 목숨을 특정 값으로 설정
   */
  setLives(lives: number): void {
    this.lives = Phaser.Math.Clamp(lives, 0, this.maxLives);
    this.updateDisplay();
  }

  /**
   * 위치 업데이트 (리사이즈 대응)
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.container.setPosition(x, y);
  }

  /**
   * 컨테이너 반환 (추가 조작 필요 시)
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * 알파값 설정 (페이드인/아웃용)
   */
  setAlpha(alpha: number): void {
    this.container.setAlpha(alpha);
  }

  /**
   * 정리 (씬 전환 시)
   */
  destroy(): void {
    this.container.destroy();
  }

  /**
   * 하트 UI 업데이트
   */
  private updateDisplay(): void {
    // 기존 하트 제거
    this.heartTexts.forEach((h) => h.destroy());
    this.heartTexts = [];

    const totalWidth =
      this.maxLives * this.heartSize + (this.maxLives - 1) * this.spacing;

    // 정렬에 따른 시작 X 계산
    let startX: number;
    switch (this.align) {
      case 'left':
        startX = 0;
        break;
      case 'right':
        startX = -totalWidth;
        break;
      case 'center':
      default:
        startX = -totalWidth / 2 + this.heartSize / 2;
        break;
    }

    for (let i = 0; i < this.maxLives; i++) {
      const heart = this.scene.add
        .text(
          startX + i * (this.heartSize + this.spacing),
          0,
          i < this.lives ? '❤️' : '🖤',
          { fontSize: `${this.heartSize}px` }
        )
        .setOrigin(0.5);

      this.container.add(heart);
      this.heartTexts.push(heart);
    }
  }

  /**
   * 목숨 감소 시 애니메이션
   */
  private playLoseAnimation(): void {
    // 흔들림 효과
    this.scene.tweens.add({
      targets: this.container,
      x: this.x - 5,
      duration: 50,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.container.x = this.x;
      },
    });
  }

  /**
   * 목숨 증가 시 애니메이션
   */
  private playGainAnimation(): void {
    // 스케일 효과
    this.scene.tweens.add({
      targets: this.container,
      scale: 1.2,
      duration: 100,
      yoyo: true,
    });
  }
}

