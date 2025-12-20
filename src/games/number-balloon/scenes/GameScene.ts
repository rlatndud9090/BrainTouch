import Phaser from 'phaser';
import {
  BalloonData,
  generateBalloons,
  getCorrectOrder,
  getRoundConfig,
} from '../utils/BalloonGenerator';
import { BASE_COLORS } from '../../../shared/colors';
import { playCountdown } from '../../../shared/ui';

// 게임 색상
const COLORS = {
  BG_SKY: 0x87ceeb,
  TEXT_PRIMARY: '#ffffff',
  TEXT_DARK: '#2c3e50',
  TEXT_SECONDARY: '#7f8c8d',
  HUD_BG: 0x2c3e50,
  SUCCESS: 0x4ecca3,
  FAIL: 0xe94560,
};

// 풍선 스프라이트 정보
interface BalloonSprite {
  data: BalloonData;
  container: Phaser.GameObjects.Container;
  isPopped: boolean;
}

export class GameScene extends Phaser.Scene {
  // 게임 상태
  private score = 0;
  private lives = 3;
  private round = 1;
  private totalPopped = 0;
  private isPlaying = false;

  // 현재 라운드
  private balloons: BalloonData[] = [];
  private balloonSprites: BalloonSprite[] = [];
  private correctOrder: number[] = [];
  private currentIndex = 0; // 다음에 터뜨려야 할 순서

  // UI 요소
  private livesText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private balloonContainer!: Phaser.GameObjects.Container;

  // 게임 영역
  private gameAreaWidth = 0;
  private gameAreaHeight = 0;
  private gameAreaTop = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // 상태 초기화
    this.score = 0;
    this.lives = 3;
    this.round = 1;
    this.totalPopped = 0;
    this.isPlaying = false;
    this.balloonSprites = [];
    this.currentIndex = 0;

    // 레이아웃 계산
    this.calculateLayout(width, height);

    // 배경
    this.createBackground(width, height);

    // HUD
    this.createHUD(width);

    // 풍선 컨테이너
    this.balloonContainer = this.add.container(0, this.gameAreaTop);

    // 안내 텍스트
    this.instructionText = this.add
      .text(width / 2, this.gameAreaTop - 30, '작은 숫자부터 순서대로 터치!', {
        fontSize: '18px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_DARK,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // 첫 라운드 준비
    this.prepareRound();
    this.balloonContainer.setAlpha(0);

    // 카운트다운 시작
    playCountdown(this, () => this.startGame(), {
      color: COLORS.TEXT_DARK,
    });

    // 리사이즈 대응
    this.scale.on('resize', this.handleResize, this);
  }

  private calculateLayout(width: number, height: number): void {
    const hudHeight = 80;
    const instructionHeight = 50;
    this.gameAreaTop = hudHeight + instructionHeight;
    this.gameAreaWidth = width;
    this.gameAreaHeight = height - this.gameAreaTop - 20;
  }

  private createBackground(width: number, height: number): void {
    // 하늘색 그라데이션 배경
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xb0e0e6, 0xb0e0e6);
    bg.fillRect(0, 0, width, height);

    // 구름 장식 (간단히)
    this.addClouds(width);
  }

  private addClouds(width: number): void {
    const cloudPositions = [
      { x: width * 0.1, y: 40, scale: 0.6 },
      { x: width * 0.8, y: 60, scale: 0.8 },
      { x: width * 0.5, y: 30, scale: 0.5 },
    ];

    cloudPositions.forEach((pos) => {
      const cloud = this.add.graphics();
      cloud.fillStyle(0xffffff, 0.7);
      cloud.fillCircle(0, 0, 20 * pos.scale);
      cloud.fillCircle(25 * pos.scale, -5, 25 * pos.scale);
      cloud.fillCircle(50 * pos.scale, 0, 20 * pos.scale);
      cloud.setPosition(pos.x, pos.y);
    });
  }

  private createHUD(width: number): void {
    const hudY = 25;

    // HUD 배경
    const hudBg = this.add.rectangle(width / 2, 40, width, 80, COLORS.HUD_BG, 0.9);
    hudBg.setOrigin(0.5);

    // 라이프 (왼쪽)
    this.livesText = this.add
      .text(20, hudY, '❤️❤️❤️', {
        fontSize: '24px',
        fontFamily: 'Pretendard, sans-serif',
      })
      .setOrigin(0, 0.5);

    // 라운드 (중앙)
    this.roundText = this.add
      .text(width / 2, hudY, 'Round 1', {
        fontSize: '20px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_PRIMARY,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // 점수 (오른쪽)
    this.scoreText = this.add
      .text(width - 20, hudY, '0점', {
        fontSize: '24px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#ffc947',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5);

    // 난이도 표시
    const config = getRoundConfig(this.round);
    this.add
      .text(width / 2, hudY + 25, `풍선 ${config.balloonCount}개`, {
        fontSize: '14px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5);
  }

  private prepareRound(): void {
    // 기존 풍선 제거
    this.balloonSprites.forEach((bs) => bs.container.destroy());
    this.balloonSprites = [];
    this.currentIndex = 0;

    // 풍선 생성
    this.balloons = generateBalloons(this.round, this.gameAreaWidth, this.gameAreaHeight);
    this.correctOrder = getCorrectOrder(this.balloons);

    // 풍선 스프라이트 생성
    this.createBalloonSprites();

    // UI 업데이트
    this.roundText.setText(`Round ${this.round}`);
  }

  private createBalloonSprites(): void {
    this.balloons.forEach((data) => {
      const sprite = this.createBalloonSprite(data);
      this.balloonSprites.push(sprite);
      this.balloonContainer.add(sprite.container);
    });
  }

  private createBalloonSprite(data: BalloonData): BalloonSprite {
    const container = this.add.container(data.x, data.y);

    // 풍선 본체 (원)
    const balloon = this.add.graphics();
    balloon.fillStyle(data.color, 1);
    balloon.fillCircle(0, 0, data.size);

    // 하이라이트 (빛 반사 효과)
    balloon.fillStyle(0xffffff, 0.3);
    balloon.fillCircle(-data.size * 0.3, -data.size * 0.3, data.size * 0.25);

    // 풍선 꼭지
    const knot = this.add.graphics();
    knot.fillStyle(data.color, 1);
    knot.fillTriangle(-5, data.size, 5, data.size, 0, data.size + 15);

    // 끈
    const string = this.add.graphics();
    string.lineStyle(2, 0x888888, 0.8);
    string.lineBetween(0, data.size + 15, 0, data.size + 40);

    // 숫자 텍스트
    const fontSize = Math.max(data.size * 0.6, 20);
    const text = this.add
      .text(0, 0, String(data.value), {
        fontSize: `${fontSize}px`,
        fontFamily: 'Pretendard, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    container.add([string, knot, balloon, text]);

    // 인터랙션 히트 영역
    const hitArea = this.add.circle(0, 0, data.size, 0xffffff, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    const balloonSprite: BalloonSprite = {
      data,
      container,
      isPopped: false,
    };

    // 클릭 이벤트
    hitArea.on('pointerdown', () => {
      if (!this.isPlaying || balloonSprite.isPopped) return;
      this.onBalloonTap(balloonSprite);
    });

    // 살짝 흔들리는 애니메이션
    this.tweens.add({
      targets: container,
      y: data.y + randomFloat(-5, 5),
      x: data.x + randomFloat(-3, 3),
      duration: randomInt(1500, 2500),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return balloonSprite;
  }

  private onBalloonTap(balloonSprite: BalloonSprite): void {
    const expectedId = this.correctOrder[this.currentIndex];

    if (balloonSprite.data.id === expectedId) {
      // 정답!
      this.handleCorrectTap(balloonSprite);
    } else {
      // 오답!
      this.handleWrongTap(balloonSprite);
    }
  }

  private handleCorrectTap(balloonSprite: BalloonSprite): void {
    balloonSprite.isPopped = true;
    this.currentIndex++;
    this.totalPopped++;

    // 점수 추가 (라운드가 높을수록 더 많은 점수)
    const points = 10 * this.round;
    this.score += points;
    this.scoreText.setText(`${this.score}점`);

    // 터지는 애니메이션
    this.popBalloon(balloonSprite, true);

    // 라운드 클리어 체크
    if (this.currentIndex >= this.balloons.length) {
      this.handleRoundClear();
    }
  }

  private handleWrongTap(balloonSprite: BalloonSprite): void {
    this.lives--;
    this.updateLivesDisplay();

    // 틀린 피드백
    this.showWrongFeedback(balloonSprite);

    // 게임 오버 체크
    if (this.lives <= 0) {
      this.endGame();
    }
  }

  private popBalloon(balloonSprite: BalloonSprite, success: boolean): void {
    const { container } = balloonSprite;

    // 파티클 효과 (간단히)
    const particles = this.add.graphics();
    particles.fillStyle(balloonSprite.data.color, 0.8);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 20;
      particles.fillCircle(
        container.x + Math.cos(angle) * dist,
        container.y + this.gameAreaTop + Math.sin(angle) * dist,
        5
      );
    }

    this.tweens.add({
      targets: particles,
      alpha: 0,
      duration: 300,
      onComplete: () => particles.destroy(),
    });

    // 터지는 애니메이션
    this.tweens.add({
      targets: container,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 150,
      ease: 'Quad.easeOut',
      onComplete: () => {
        container.setVisible(false);
      },
    });

    // 점수 표시
    if (success) {
      const points = 10 * this.round;
      const pointsText = this.add
        .text(container.x, container.y + this.gameAreaTop, `+${points}`, {
          fontSize: '24px',
          fontFamily: 'Pretendard, sans-serif',
          color: '#4ecca3',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: pointsText,
        y: pointsText.y - 40,
        alpha: 0,
        duration: 500,
        onComplete: () => pointsText.destroy(),
      });
    }
  }

  private showWrongFeedback(balloonSprite: BalloonSprite): void {
    // 화면 흔들기
    this.cameras.main.shake(200, 0.01);

    // 풍선 흔들기
    this.tweens.add({
      targets: balloonSprite.container,
      x: balloonSprite.data.x - 10,
      duration: 50,
      yoyo: true,
      repeat: 3,
    });

    // X 표시
    const xMark = this.add
      .text(balloonSprite.container.x, balloonSprite.container.y + this.gameAreaTop, '❌', {
        fontSize: '40px',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: xMark,
      alpha: 0,
      y: xMark.y - 30,
      duration: 500,
      onComplete: () => xMark.destroy(),
    });
  }

  private updateLivesDisplay(): void {
    const hearts = '❤️'.repeat(this.lives) + '🖤'.repeat(3 - this.lives);
    this.livesText.setText(hearts);
  }

  private handleRoundClear(): void {
    this.round++;

    // 라운드 클리어 표시
    const clearText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, '🎉 Clear!', {
        fontSize: '48px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_DARK,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: clearText,
      alpha: 1,
      scale: 1.2,
      duration: 300,
      yoyo: true,
      hold: 300,
      onComplete: () => {
        clearText.destroy();
        this.prepareRound();
        this.balloonContainer.setAlpha(1);
      },
    });
  }

  private startGame(): void {
    this.isPlaying = true;
    this.balloonContainer.setAlpha(1);
    this.instructionText.setAlpha(1);
  }

  private endGame(): void {
    this.isPlaying = false;

    this.scene.start('ResultScene', {
      score: this.score,
      maxRound: this.round,
      totalPopped: this.totalPopped,
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    this.calculateLayout(width, height);
  }
}

// 유틸 함수
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
