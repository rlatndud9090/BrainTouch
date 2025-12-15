import Phaser from 'phaser';
import {
  MeteorData,
  generateMeteors,
  generateMinusMeteors,
  getMeteorConfig,
  shouldTriggerMinusTurn,
} from '../utils/MeteorGenerator';

// 색상 상수
const COLORS = {
  BG_SPACE: 0x0a0a1a,
  METEOR_SUCCESS: 0x4ecca3,
  METEOR_DANGER: 0xe94560,
  METEOR_MINUS: 0x9b59b6,
  POWER_TEXT: '#ffc947',
  PLAYER: 0x00d4ff,
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#a0a0a0',
  LANE_LINE: 0x1a1a3a,
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
  private power = 10;
  private score = 0;
  private lives = 3;
  private playerX = 0; // 플레이어 X 좌표 (자유 이동)
  private turnCount = 0;
  private consecutiveOptimal = 0;
  private consecutiveFail = 0;
  private isMinusTurn = false;
  private startTime = 0;
  private maxPower = 10;
  private isPlaying = false;
  private hasCollidedThisWave = false; // 이번 웨이브에서 충돌했는지

  // UI 요소
  private livesText!: Phaser.GameObjects.Text;
  private powerText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private player!: Phaser.GameObjects.Container;

  // 운석
  private meteors: MeteorSprite[] = [];
  private meteorSpeed = 0; // 픽셀/ms

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
    this.meteorSpeed = height / 3000; // 3초에 화면 통과
  }

  private resetGameState(): void {
    this.power = 10;
    this.score = 0;
    this.lives = 3;
    this.playerX = this.scale.width / 2; // 화면 중앙에서 시작
    this.turnCount = 0;
    this.consecutiveOptimal = 0;
    this.consecutiveFail = 0;
    this.isMinusTurn = false;
    this.maxPower = 10;
    this.isPlaying = false;
    this.hasCollidedThisWave = false;
    this.meteors = [];
  }

  private createBackground(width: number, height: number): void {
    this.add.rectangle(0, 0, width, height, COLORS.BG_SPACE).setOrigin(0, 0);

    // 별 효과 (간단한 파티클)
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

    // 레인 사이 구분선
    for (let i = 1; i < 5; i++) {
      const x = width * ((LANE_POSITIONS[i - 1] + LANE_POSITIONS[i]) / 2);
      graphics.lineBetween(x, 60, x, height - 50);
    }
  }

  private createHUD(width: number): void {
    // 라이프 (우상단)
    this.livesText = this.add
      .text(width - 16, 16, '❤️❤️❤️', {
        fontSize: '24px',
        fontFamily: 'Pretendard, sans-serif',
      })
      .setOrigin(1, 0);

    // 점수 (좌상단)
    this.scoreText = this.add
      .text(16, 16, '0점', {
        fontSize: '20px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_PRIMARY,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);

    // 파워 (캐릭터 상단에서 따라다님)
    this.powerText = this.add
      .text(this.playerX, this.playerY - 50, '10', {
        fontSize: '24px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.POWER_TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 1);
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
    // 씬 전체를 인터랙티브 영역으로 설정
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPlaying) return;
      this.movePlayerToX(pointer.x);
    });

    // 드래그 중 이동 (pointer.isDown 체크 없이 항상)
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPlaying) return;
      // primaryDown: 터치 또는 마우스 좌클릭 중인지
      if (pointer.primaryDown) {
        this.movePlayerToX(pointer.x);
      }
    });
  }

  private movePlayerToX(x: number): void {
    const { width } = this.scale;
    // 화면 경계 내로 제한 (좌우 여백 30px)
    const clampedX = Phaser.Math.Clamp(x, 30, width - 30);

    this.playerX = clampedX;

    // 플레이어와 파워 텍스트 즉시 이동 (드래그 느낌)
    this.player.x = clampedX;
    this.powerText.x = clampedX;
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

    // 새 웨이브 시작 - 충돌 플래그 리셋
    this.hasCollidedThisWave = false;

    // 마이너스 턴 체크
    this.isMinusTurn = shouldTriggerMinusTurn(this.power, this.turnCount);

    // 운석 생성
    let meteorData: MeteorData[];
    if (this.isMinusTurn) {
      meteorData = generateMinusMeteors(this.power);
      this.showMinusTurnWarning();
    } else {
      const config = getMeteorConfig(this.consecutiveOptimal, this.consecutiveFail);
      meteorData = generateMeteors(this.power, config.successCount, config.failCount);
    }

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

    // 운석 색상 통일 (마이너스 턴만 다르게)
    const color = this.isMinusTurn ? COLORS.METEOR_MINUS : 0x4a6fa5;

    // 운석 배경
    const bg = this.add.circle(0, 0, 30, color);

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

  private showMinusTurnWarning(): void {
    const { width, height } = this.scale;

    const warning = this.add
      .text(width / 2, height / 2, '⚠️ 마이너스 턴!', {
        fontSize: '32px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#9b59b6',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: warning,
      alpha: 1,
      duration: 200,
      yoyo: true,
      hold: 500,
      onComplete: () => warning.destroy(),
    });
  }

  update(_time: number, delta: number): void {
    if (!this.isPlaying) return;

    // 운석 이동
    this.updateMeteors(delta);

    // 충돌 체크
    this.checkCollisions();

    // 다음 웨이브 스폰 체크
    this.checkNextWave();
  }

  private updateMeteors(delta: number): void {
    const { height } = this.scale;

    this.meteors.forEach((meteor) => {
      meteor.y += this.meteorSpeed * delta;
      meteor.container.y = meteor.y;

      // 화면 밖으로 나간 운석 제거 (놓친 경우)
      if (meteor.y > height + 50) {
        meteor.container.destroy();
      }
    });

    // 화면 밖 운석 필터링
    this.meteors = this.meteors.filter((m) => m.y <= this.scale.height + 50);
  }

  private checkCollisions(): void {
    // 이번 웨이브에서 이미 충돌했으면 스킵
    if (this.hasCollidedThisWave) return;

    const collisionRadius = 35; // 충돌 반경 (플레이어 + 운석)

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const meteor = this.meteors[i];
      const meteorX = this.laneXPositions[meteor.data.lane];

      // 거리 기반 충돌 체크
      const dx = this.playerX - meteorX;
      const dy = this.playerY - meteor.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < collisionRadius) {
        this.hasCollidedThisWave = true; // 충돌 플래그 설정
        this.handleCollision(meteor);
        meteor.container.destroy();
        this.meteors.splice(i, 1);
        break; // 한 번에 하나만 처리
      }
    }
  }

  private handleCollision(meteor: MeteorSprite): void {
    const { value, isOptimal } = meteor.data;

    if (this.isMinusTurn) {
      // 마이너스 턴: 무조건 파워 감소
      this.power += value; // value는 음수
      this.power = Math.max(1, this.power); // 최소 1 유지

      // 점수 계산 (절대값 작을수록 보너스)
      const baseScore = Math.abs(value) * 10;
      const bonus = isOptimal ? 2 : 1;
      this.score += baseScore * bonus;

      this.showPowerChange(value);

      if (isOptimal) {
        this.consecutiveOptimal++;
        this.consecutiveFail = 0;
      } else {
        this.consecutiveOptimal = 0;
      }
    } else {
      // 일반 턴
      if (value <= this.power) {
        // 성공: 파워 증가
        this.power += value;
        this.power = Math.min(99, this.power);
        this.maxPower = Math.max(this.maxPower, this.power);

        // 점수 계산
        const baseScore = value * 10;
        const bonus = isOptimal ? 1.5 : 1;
        this.score += Math.floor(baseScore * bonus);

        this.showPowerChange(value);

        if (isOptimal) {
          this.consecutiveOptimal++;
          this.consecutiveFail = 0;
        } else {
          this.consecutiveOptimal = 0;
        }
      } else {
        // 실패: 라이프 감소
        this.lives--;
        this.consecutiveOptimal = 0;
        this.consecutiveFail++;

        this.showDamageEffect();

        if (this.lives <= 0) {
          this.endGame();
          return;
        }
      }
    }

    this.updateHUD();
  }

  private showPowerChange(value: number): void {
    const sign = value > 0 ? '+' : '';
    const color = value > 0 ? '#4ecca3' : '#9b59b6';

    const popup = this.add
      .text(this.player.x, this.player.y - 50, `${sign}${value}`, {
        fontSize: '24px',
        fontFamily: 'Pretendard, sans-serif',
        color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: popup,
      y: popup.y - 30,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => popup.destroy(),
    });
  }

  private showDamageEffect(): void {
    // 화면 빨간색 플래시
    const { width, height } = this.scale;
    const flash = this.add.rectangle(0, 0, width, height, 0xe94560, 0.3).setOrigin(0, 0);

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
  }

  private updateHUD(): void {
    // 라이프
    this.livesText.setText('❤️'.repeat(this.lives) + '🖤'.repeat(3 - this.lives));

    // 파워 (숫자만)
    this.powerText.setText(`${this.power}`);

    // 점수
    this.scoreText.setText(`${this.score}점`);
  }

  private checkNextWave(): void {
    // 모든 운석이 화면 중간을 넘었으면 다음 웨이브
    const midY = this.scale.height * 0.5;
    const allPassed = this.meteors.every((m) => m.y > midY);

    if (allPassed && this.meteors.length > 0) {
      // 이미 다음 웨이브가 있으면 스킵
      const hasUpcoming = this.meteors.some((m) => m.y < midY);
      if (!hasUpcoming) {
        this.spawnMeteorWave();
      }
    }
  }

  private endGame(): void {
    this.isPlaying = false;

    const survivalTime = Date.now() - this.startTime;

    this.scene.start('ResultScene', {
      totalScore: this.score,
      survivalTime,
      maxPower: this.maxPower,
      turnCount: this.turnCount,
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    this.calculateLayout(width, height);

    // UI 위치 업데이트
    this.livesText?.setPosition(width - 16, 16);

    // 플레이어 위치를 화면 비율에 맞게 조정
    if (this.player) {
      // 화면 경계 내로 재조정
      this.playerX = Phaser.Math.Clamp(this.playerX, 30, width - 30);
      this.player.x = this.playerX;
      this.player.y = this.playerY;
      this.powerText?.setPosition(this.playerX, this.playerY - 50);
    }
  }
}
