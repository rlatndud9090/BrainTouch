import Phaser from 'phaser';
import {
  MeteorData,
  Difficulty,
  generateMeteors,
  getDifficulty,
  getSpeedMultiplier,
  isSuccessMeteor,
  isMedianMeteor,
} from '../utils/MeteorGenerator';
import { BASE_COLORS, THEME_PRESETS } from '../../../shared/colors';
import { showStartScreen } from '../../../shared/ui';
import { TopBar, TOP_BAR } from '../../../shared/topBar';
import { FONTS } from '../../../shared/constants';

const THEME = THEME_PRESETS.mathFlight;

// 레인 X 좌표 비율
const LANE_POSITIONS = [0.1, 0.3, 0.5, 0.7, 0.9];

// 운석 크기 margin (레인 너비 대비)
const METEOR_MARGIN = 0.15; // 15% margin 양쪽

// 운석 스프라이트
interface MeteorSprite {
  data: MeteorData;
  container: Phaser.GameObjects.Container;
  y: number;
  processed: boolean; // 판정 완료 여부
}

export class GameScene extends Phaser.Scene {
  // 게임 상태
  private score = 0;
  private turnCount = 0;
  private playerX = 0;
  private startTime = 0;
  private isPlaying = false;
  private hasCollidedThisWave = false;
  private currentDifficulty: Difficulty = 'easy';
  private isPointerDown = false; // 드래그 상태 추적

  // UI 요소
  private topBar!: TopBar;
  private player!: Phaser.GameObjects.Container;

  // 운석
  private meteors: MeteorSprite[] = [];
  private baseSpeed = 0;

  // 레이아웃
  private laneXPositions: number[] = [];
  private laneWidth = 0; // 레인 너비
  private meteorRadius = 0; // 운석 반지름
  private playerY = 0;
  private meteorStartY = 0;
  private collisionLineY = 0; // 판정 라인 Y 좌표

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
    this.createHUD();

    // 플레이어
    this.createPlayer();

    // 입력 설정
    this.setupInput();

    // 시작 화면 표시
    showStartScreen(this, {
      title: '🚀 중간값 운석을 맞추세요!',
      subtitle: '5개 중 가장 큰/작은 수를 피하고\n중간 3개를 맞추면 성공',
      onStart: () => this.startGame(),
    });

    // 리사이즈 대응
    this.scale.on('resize', this.handleResize, this);
  }

  private calculateLayout(width: number, height: number): void {
    this.laneXPositions = LANE_POSITIONS.map((ratio) => width * ratio);

    // 레인 너비 계산 (인접 레인 간 거리)
    this.laneWidth = width * (LANE_POSITIONS[1] - LANE_POSITIONS[0]);

    // 운석 반지름: 레인 너비의 절반에서 margin 제외
    this.meteorRadius = (this.laneWidth / 2) * (1 - METEOR_MARGIN);

    this.playerY = height * 0.85;
    this.collisionLineY = this.playerY; // 판정 라인 = 플레이어 Y
    this.meteorStartY = -this.meteorRadius - 10;
    this.baseSpeed = height / 3000; // 3초에 화면 통과 (기본)
  }

  private resetGameState(): void {
    this.score = 0;
    // lives는 LivesManager에서 관리
    this.turnCount = 0;
    this.playerX = this.scale.width / 2;
    this.currentDifficulty = 'easy';
    this.isPlaying = false;
    this.isPointerDown = false;
    this.hasCollidedThisWave = false;
    this.meteors = [];
  }

  private createBackground(width: number, height: number): void {
    this.add.rectangle(0, 0, width, height, BASE_COLORS.BG_SPACE).setOrigin(0, 0);

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
    graphics.lineStyle(1, BASE_COLORS.LANE_LINE, 0.3);

    for (let i = 1; i < 5; i++) {
      const x = width * ((LANE_POSITIONS[i - 1] + LANE_POSITIONS[i]) / 2);
      graphics.lineBetween(x, 60, x, height - 50);
    }
  }

  private createHUD(): void {
    // 공통 상단 바 생성: 하트 | - | 점수 (다른 게임과 통일)
    this.topBar = new TopBar(this, {
      left: { type: 'lives', maxLives: 3 },
      right: { type: 'score', initialValue: 0 },
      showBackground: true,
      backgroundColor: 0x000000,
      backgroundAlpha: 0.3, // 반투명 배경으로 별과 겹쳐도 가독성 유지
    });

    // 대기 화면 동안 숨김 (폰트 로딩 전 깨짐 방지)
    this.topBar.setAlpha(0);
  }

  private createPlayer(): void {
    this.player = this.add.container(this.playerX, this.playerY);

    // 플레이어 모양 (삼각형 우주선)
    const ship = this.add.graphics();
    ship.fillStyle(THEME.player, 1);
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
    // pointerdown: 터치/클릭 시작
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPlaying) return;
      this.isPointerDown = true;
      this.movePlayerToX(pointer.x);
    });

    // pointermove: 드래그 중
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPlaying) return;
      // pointer.isDown 또는 자체 플래그 사용 (터치 호환성)
      if (pointer.isDown || this.isPointerDown) {
        this.movePlayerToX(pointer.x);
      }
    });

    // pointerup: 터치/클릭 종료
    this.input.on('pointerup', () => {
      this.isPointerDown = false;
    });

    // pointerupoutside: 화면 밖에서 터치 종료
    this.input.on('pointerupoutside', () => {
      this.isPointerDown = false;
    });

    // 추가: pointerout 처리 (터치가 캔버스 밖으로 나갔을 때)
    this.input.on('pointerout', () => {
      this.isPointerDown = false;
    });
  }

  private movePlayerToX(x: number): void {
    const { width } = this.scale;
    const clampedX = Phaser.Math.Clamp(x, 30, width - 30);
    this.playerX = clampedX;
    this.player.x = clampedX;
  }

  private startGame(): void {
    this.isPlaying = true;
    this.startTime = Date.now();

    // TopBar 표시
    this.topBar.setAlpha(1);

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

    // 운석 배경 (레인 너비에 맞춘 크기)
    const bg = this.add.circle(0, 0, this.meteorRadius, THEME.meteorNormal);

    // 숫자 텍스트 (Cherry Bomb One 폰트)
    const fontSize = Math.max(18, Math.floor(this.meteorRadius * 0.75));
    const text = this.add
      .text(0, 0, data.value.toString(), {
        fontSize: `${fontSize}px`,
        fontFamily: FONTS.NUMBER,
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setResolution(2); // 고해상도 렌더링으로 블러 방지

    container.add([bg, text]);

    return {
      data,
      container,
      y,
      processed: false, // 아직 판정 안됨
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
      // 정수 좌표로 렌더링하여 블러 방지
      meteor.container.y = Math.round(meteor.y);

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

    // 판정 허용 범위 (Y 좌표 기준)
    const collisionThreshold = 20;

    // 플레이어가 현재 어느 레인에 있는지 판정
    const playerLane = this.getPlayerLane();

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const meteor = this.meteors[i];

      // 이미 판정된 운석은 스킵
      if (meteor.processed) continue;

      // 운석이 판정 라인을 지나갔는지 체크
      const crossedLine =
        meteor.y >= this.collisionLineY - collisionThreshold &&
        meteor.y <= this.collisionLineY + collisionThreshold;

      if (crossedLine) {
        // 이 운석의 레인과 플레이어 레인이 같으면 충돌!
        if (meteor.data.lane === playerLane) {
          this.hasCollidedThisWave = true;
          meteor.processed = true;
          this.handleCollision(meteor);
          meteor.container.destroy();
          this.meteors.splice(i, 1);
          break;
        }
      }

      // 운석이 판정 라인을 완전히 지나갔으면 처리 완료로 표시
      if (meteor.y > this.collisionLineY + collisionThreshold) {
        meteor.processed = true;
      }
    }
  }

  // 플레이어가 현재 어느 레인에 있는지 판정
  private getPlayerLane(): number {
    let closestLane = 0;
    let minDistance = Infinity;

    for (let i = 0; i < this.laneXPositions.length; i++) {
      const distance = Math.abs(this.playerX - this.laneXPositions[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestLane = i;
      }
    }

    return closestLane;
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
      const isGameOver = this.topBar.loseLife('left');
      this.showFailEffect();

      if (isGameOver) {
        this.endGame();
        return;
      }
    }

    this.topBar.updateValue('right', this.score);
  }

  private showSuccessEffect(meteor: MeteorSprite, score: number, isMedian: boolean): void {
    const color = isMedian ? THEME.medianFlash : THEME.successFlash;
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
    const flash = this.add.rectangle(0, 0, width, height, THEME.failFlash, 0.3).setOrigin(0, 0);

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

  private updateScoreDisplay(): void {
    this.topBar.updateValue('right', this.score);
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

    this.topBar?.handleResize(width);

    if (this.player) {
      this.playerX = Phaser.Math.Clamp(this.playerX, 30, width - 30);
      this.player.x = this.playerX;
      this.player.y = this.playerY;
    }
  }
}
