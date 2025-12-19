import Phaser from 'phaser';
import {
  MeteorData,
  MeteorType,
  Difficulty,
  generateMeteors,
  getDifficulty,
  getSpeedMultiplier,
  isSuccessMeteor,
  isMedianMeteor,
} from '../utils/MeteorGenerator';

// 색상 상수
const COLORS = {
  BG_SPACE: 0x0a0a1a,
  METEOR_NORMAL: 0x4a6fa5,
  PLAYER: 0x00d4ff,
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#a0a0a0',
  LANE_LINE: 0x1a1a3a,
  SUCCESS_FLASH: 0x4ecca3,
  FAIL_FLASH: 0xe94560,
  MEDIAN_FLASH: 0xffc947,
};

// 레인 X 좌표 비율
const LANE_POSITIONS = [0.1, 0.3, 0.5, 0.7, 0.9];

// 운석 스프라이트
interface MeteorSprite {
  data: MeteorData;
  container: Phaser.GameObjects.Container;
  y: number;
}

export class GameScene extends Phaser.Scene {
  // 게임 상태
  private score = 0;
  private lives = 3;
  private turnCount = 0;
  private playerX = 0;
  private startTime = 0;
  private isPlaying = false;
  private hasCollidedThisWave = false;
  private currentDifficulty: Difficulty = 'easy';
  private isPointerDown = false; // 드래그 상태 추적

  // UI 요소
  private livesText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private player!: Phaser.GameObjects.Container;

  // 운석
  private meteors: MeteorSprite[] = [];
  private baseSpeed = 0;

  // 레이아웃
  private laneXPositions: number[] = [];
  private playerY = 0;
  private meteorStartY = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // 레이아웃 계산
    this.calculateLayout(width, height);

    // 초기화
    this.resetGameState();

    // 배경
    this.createBackground(width, height);

    // 레인 구분선
    this.createLaneLines(width, height);

    // HUD
    this.createHUD(width);

    // 플레이어
    this.createPlayer();

    // 입력 설정
    this.setupInput();

    // 카운트다운 후 게임 시작
    this.startCountdown();

    // 리사이즈 대응
    this.scale.on('resize', this.handleResize, this);
  }

  private calculateLayout(width: number, height: number): void {
    this.laneXPositions = LANE_POSITIONS.map((ratio) => width * ratio);
    this.playerY = height * 0.85;
    this.meteorStartY = -50;
    this.baseSpeed = height / 3000; // 3초에 화면 통과 (기본)
  }

  private resetGameState(): void {
    this.score = 0;
    this.lives = 3;
    this.turnCount = 0;
    this.playerX = this.scale.width / 2;
    this.currentDifficulty = 'easy';
    this.isPlaying = false;
    this.isPointerDown = false;
    this.hasCollidedThisWave = false;
    this.meteors = [];
  }

  private createBackground(width: number, height: number): void {
    this.add.rectangle(0, 0, width, height, COLORS.BG_SPACE).setOrigin(0, 0);

    // 별 효과
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 1;
      const alpha = Math.random() * 0.5 + 0.3;
      this.add.circle(x, y, size, 0xffffff, alpha);
    }
  }

  private createLaneLines(width: number, height: number): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, COLORS.LANE_LINE, 0.3);

    for (let i = 1; i < 5; i++) {
      const x = width * ((LANE_POSITIONS[i - 1] + LANE_POSITIONS[i]) / 2);
      graphics.lineBetween(x, 60, x, height - 50);
    }
  }

  private createHUD(width: number): void {
    // 점수 (좌상단)
    this.scoreText = this.add
      .text(16, 16, '0점', {
        fontSize: '24px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_PRIMARY,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);

    // 라이프 (우상단)
    this.livesText = this.add
      .text(width - 16, 16, '❤️❤️❤️', {
        fontSize: '24px',
        fontFamily: 'Pretendard, sans-serif',
      })
      .setOrigin(1, 0);
  }

  private createPlayer(): void {
    this.player = this.add.container(this.playerX, this.playerY);

    // 플레이어 모양 (삼각형 우주선)
    const ship = this.add.graphics();
    ship.fillStyle(COLORS.PLAYER, 1);
    ship.beginPath();
    ship.moveTo(0, -20);
    ship.lineTo(-15, 15);
    ship.lineTo(15, 15);
    ship.closePath();
    ship.fill();

    // 엔진 불꽃
    const flame = this.add.graphics();
    flame.fillStyle(0xff6b35, 1);
    flame.fillTriangle(-8, 15, 8, 15, 0, 30);

    this.player.add([flame, ship]);
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPlaying) return;
      this.isPointerDown = true;
      this.movePlayerToX(pointer.x);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPlaying) return;
      // pointer.primaryDown 대신 자체 플래그 사용 (브라우저 호환성 개선)
      if (this.isPointerDown) {
        this.movePlayerToX(pointer.x);
      }
    });

    this.input.on('pointerup', () => {
      this.isPointerDown = false;
    });

    this.input.on('pointerupoutside', () => {
      this.isPointerDown = false;
    });
  }

  private movePlayerToX(x: number): void {
    const { width } = this.scale;
    const clampedX = Phaser.Math.Clamp(x, 30, width - 30);
    this.playerX = clampedX;
    this.player.x = clampedX;
  }

  private startCountdown(): void {
    const { width, height } = this.scale;

    const countdownText = this.add
      .text(width / 2, height / 2, '3', {
        fontSize: '100px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_PRIMARY,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const counts = ['3', '2', '1', 'GO!'];
    let index = 0;

    const showNext = () => {
      if (index >= counts.length) {
        countdownText.destroy();
        this.startGame();
        return;
      }

      countdownText.setText(counts[index]);
      countdownText.setFontSize(index === 3 ? '80px' : '100px');
      countdownText.setAlpha(1);
      countdownText.setScale(1.5);

      this.tweens.add({
        targets: countdownText,
        scale: 1,
        alpha: 0,
        duration: index === 3 ? 400 : 600,
        ease: 'Power2',
        onComplete: () => {
          index++;
          showNext();
        },
      });
    };

    this.time.delayedCall(300, showNext);
  }

  private startGame(): void {
    this.isPlaying = true;
    this.startTime = Date.now();
    this.spawnMeteorWave();
  }

  private spawnMeteorWave(): void {
    if (!this.isPlaying) return;

    // 충돌 플래그 리셋
    this.hasCollidedThisWave = false;

    // 난이도 업데이트
    this.currentDifficulty = getDifficulty(this.turnCount);

    // 운석 생성
    const meteorData = generateMeteors(this.currentDifficulty);

    // 운석 스프라이트 생성
    meteorData.forEach((data) => {
      const meteor = this.createMeteorSprite(data);
      this.meteors.push(meteor);
    });

    this.turnCount++;
  }

  private createMeteorSprite(data: MeteorData): MeteorSprite {
    const x = this.laneXPositions[data.lane];
    const y = this.meteorStartY;

    const container = this.add.container(x, y);

    // 운석 배경 (모두 동일 색상)
    const bg = this.add.circle(0, 0, 30, COLORS.METEOR_NORMAL);

    // 숫자 텍스트
    const text = this.add
      .text(0, 0, data.value.toString(), {
        fontSize: '20px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    container.add([bg, text]);

    return {
      data,
      container,
      y,
    };
  }

  update(_time: number, delta: number): void {
    if (!this.isPlaying) return;

    // 운석 이동 (난이도별 속도)
    this.updateMeteors(delta);

    // 충돌 체크
    this.checkCollisions();

    // 다음 웨이브 스폰 체크
    this.checkNextWave();
  }

  private updateMeteors(delta: number): void {
    const { height } = this.scale;
    const speedMultiplier = getSpeedMultiplier(this.currentDifficulty);
    const currentSpeed = this.baseSpeed * speedMultiplier;

    this.meteors.forEach((meteor) => {
      meteor.y += currentSpeed * delta;
      meteor.container.y = meteor.y;

      // 화면 밖으로 나간 운석 제거
      if (meteor.y > height + 50) {
        meteor.container.destroy();
      }
    });

    // 화면 밖 운석 필터링
    this.meteors = this.meteors.filter((m) => m.y <= this.scale.height + 50);
  }

  private checkCollisions(): void {
    if (this.hasCollidedThisWave) return;

    const collisionRadius = 35;

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const meteor = this.meteors[i];
      const meteorX = this.laneXPositions[meteor.data.lane];

      const dx = this.playerX - meteorX;
      const dy = this.playerY - meteor.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < collisionRadius) {
        this.hasCollidedThisWave = true;
        this.handleCollision(meteor);
        meteor.container.destroy();
        this.meteors.splice(i, 1);
        break;
      }
    }
  }

  private handleCollision(meteor: MeteorSprite): void {
    const { type } = meteor.data;

    if (isSuccessMeteor(type)) {
      // 성공!
      const baseScore = 100;
      const multiplier = isMedianMeteor(type) ? 2 : 1;
      const earnedScore = baseScore * multiplier;

      this.score += earnedScore;
      this.showSuccessEffect(meteor, earnedScore, isMedianMeteor(type));
    } else {
      // 실패 (min 또는 max)
      this.lives--;
      this.showFailEffect();

      if (this.lives <= 0) {
        this.endGame();
        return;
      }
    }

    this.updateHUD();
  }

  private showSuccessEffect(meteor: MeteorSprite, score: number, isMedian: boolean): void {
    const color = isMedian ? COLORS.MEDIAN_FLASH : COLORS.SUCCESS_FLASH;
    const text = isMedian ? `+${score} x2!` : `+${score}`;

    // 점수 팝업
    const popup = this.add
      .text(meteor.container.x, meteor.container.y, text, {
        fontSize: '24px',
        fontFamily: 'Pretendard, sans-serif',
        color: isMedian ? '#ffc947' : '#4ecca3',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: popup,
      y: popup.y - 40,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => popup.destroy(),
    });

    // 플래시 효과
    const { width, height } = this.scale;
    const flash = this.add.rectangle(0, 0, width, height, color, 0.2).setOrigin(0, 0);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  private showFailEffect(): void {
    const { width, height } = this.scale;

    // 화면 빨간색 플래시
    const flash = this.add.rectangle(0, 0, width, height, COLORS.FAIL_FLASH, 0.3).setOrigin(0, 0);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    // 플레이어 깜빡임
    this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 3,
    });

    // 화면 흔들림
    this.cameras.main.shake(200, 0.01);
  }

  private updateHUD(): void {
    this.livesText.setText('❤️'.repeat(this.lives) + '🖤'.repeat(3 - this.lives));
    this.scoreText.setText(`${this.score}점`);
  }

  private checkNextWave(): void {
    const midY = this.scale.height * 0.5;
    const allPassed = this.meteors.every((m) => m.y > midY);

    if (allPassed && this.meteors.length > 0) {
      const hasUpcoming = this.meteors.some((m) => m.y < midY);
      if (!hasUpcoming) {
        this.spawnMeteorWave();
      }
    }

    // 모든 운석이 화면 밖으로 나갔으면 새 웨이브
    if (this.meteors.length === 0) {
      this.spawnMeteorWave();
    }
  }

  private endGame(): void {
    this.isPlaying = false;

    const survivalTime = Date.now() - this.startTime;

    this.scene.start('ResultScene', {
      totalScore: this.score,
      survivalTime,
      turnCount: this.turnCount,
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    this.calculateLayout(width, height);

    this.livesText?.setPosition(width - 16, 16);

    if (this.player) {
      this.playerX = Phaser.Math.Clamp(this.playerX, 30, width - 30);
      this.player.x = this.playerX;
      this.player.y = this.playerY;
    }
  }
}
