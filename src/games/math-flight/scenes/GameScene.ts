import Phaser from 'phaser';
import { MeteorData, generateMeteors, isSuccessMeteor } from '../utils/MeteorGenerator';
import {
  DifficultyAxis,
  DifficultyAxisLevels,
  ROUND_UPGRADE_INTERVAL,
  createInitialDifficultyLevels,
  downgradeDifficultyOnFail,
  resolveRoundDifficulty,
  upgradeDifficulty,
} from '../utils/DifficultyDirector';
import { BASE_COLORS, THEME_PRESETS } from '../../../shared/colors';
import { showStartScreen } from '../../../shared/ui';
import { TopBar } from '../../../shared/topBar';
import { FONTS } from '../../../shared/constants';

const THEME = THEME_PRESETS.mathFlight;

// 레인 X 좌표 비율
const LANE_POSITIONS = [0.2, 0.5, 0.8];

// 운석 크기 margin (레인 너비 대비)
const METEOR_MARGIN = 0.15; // 15% margin 양쪽
const TRAIL_SWAP_INTERVAL_MS = 125; // 1초에 8회
const PLAYER_SIZE_FACTOR = 1.485;
const METEOR_CORE_DISPLAY_FACTOR = 3.0;
const METEOR_SPLIT_DISPLAY_FACTOR = 3.1;
const METEOR_FLAME_WRAP_WIDTH_FACTOR = 5.5;
const METEOR_FLAME_WRAP_HEIGHT_FACTOR = 3.52;
const METEOR_FLAME_VERTICAL_OFFSET_FACTOR = 0.5;
const MEDIAN_HIT_DURATION_MS = 500;
const METEOR_LABEL_SHADOW_COLOR = 'rgba(0, 0, 0, 0.45)';
const MAX_TEXT_RESOLUTION = 3;

const DEPTH_METEOR = 120;
const DEPTH_PLAYER = 180;
const DEPTH_EFFECT = 220;

const TEXTURE_KEYS = {
  ship: 'math-flight-ship-player',
  meteorCore: 'math-flight-meteor-core',
  meteorSplitHit: 'math-flight-meteor-split-hit',
  meteorTrail1: 'math-flight-meteor-trail-1',
  meteorTrail2: 'math-flight-meteor-trail-2',
} as const;

const TEXTURE_URLS = {
  ship: new URL('../../../assets/sprites/math-flight/ship_player.png', import.meta.url).href,
  meteorCore: new URL('../../../assets/sprites/math-flight/meteor_core.png', import.meta.url).href,
  meteorSplitHit: new URL(
    '../../../assets/sprites/math-flight/meteor_split_hit.png',
    import.meta.url,
  ).href,
  meteorTrail1: new URL(
    '../../../assets/sprites/math-flight/meteor_trail_flame1.png',
    import.meta.url,
  ).href,
  meteorTrail2: new URL(
    '../../../assets/sprites/math-flight/meteor_trail_flame2.png',
    import.meta.url,
  ).href,
} as const;

const TRAIL_TEXTURE_ORDER = [TEXTURE_KEYS.meteorTrail1, TEXTURE_KEYS.meteorTrail2] as const;

// 운석 스프라이트
interface MeteorSprite {
  data: MeteorData;
  container: Phaser.GameObjects.Container;
  core: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  trail: Phaser.GameObjects.Image;
  y: number;
  trailFrameIndex: number;
  trailElapsedMs: number;
  processed: boolean; // 판정 완료 여부
}

export class GameScene extends Phaser.Scene {
  // 게임 상태
  private score = 0;
  private turnCount = 0;
  private successfulHits = 0;
  private playerX = 0;
  private startTime = 0;
  private isPlaying = false;
  private hasCollidedThisWave = false;
  private isPointerDown = false; // 드래그 상태 추적
  private difficultyLevels: DifficultyAxisLevels = createInitialDifficultyLevels();
  private difficultyUpgradeHistory: DifficultyAxis[] = [];
  private currentSpeedMultiplier = 1;

  // UI 요소
  private topBar!: TopBar;
  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.GameObjects.Image;
  private laneLines?: Phaser.GameObjects.Graphics;

  // 운석
  private meteors: MeteorSprite[] = [];
  private baseSpeed = 0;

  // 레이아웃
  private laneXPositions: number[] = [];
  private laneWidth = 0; // 레인 너비
  private meteorRadius = 0; // 운석 반지름
  private playerSize = 0;
  private playerEdgePadding = 30;
  private playerY = 0;
  private meteorStartY = 0;
  private collisionLineY = 0; // 판정 라인 Y 좌표

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    this.loadTextureIfMissing(TEXTURE_KEYS.ship, TEXTURE_URLS.ship);
    this.loadTextureIfMissing(TEXTURE_KEYS.meteorCore, TEXTURE_URLS.meteorCore);
    this.loadTextureIfMissing(TEXTURE_KEYS.meteorSplitHit, TEXTURE_URLS.meteorSplitHit);
    this.loadTextureIfMissing(TEXTURE_KEYS.meteorTrail1, TEXTURE_URLS.meteorTrail1);
    this.loadTextureIfMissing(TEXTURE_KEYS.meteorTrail2, TEXTURE_URLS.meteorTrail2);
  }

  private loadTextureIfMissing(key: string, url: string): void {
    if (!this.textures.exists(key)) {
      this.load.image(key, url);
    }
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
      subtitle: '3개 중 정확히 중간값만 맞추면 성공',
      onStart: () => this.startGame(),
    });

    // 리사이즈 대응
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupResizeListener, this);
  }

  private getTextResolution(): number {
    const dpr = typeof window === 'undefined' ? 2 : window.devicePixelRatio || 1;
    return Math.max(2, Math.min(dpr, MAX_TEXT_RESOLUTION));
  }

  private calculateLayout(width: number, height: number): void {
    this.laneXPositions = LANE_POSITIONS.map((ratio) => Math.round(width * ratio));

    // 레인 너비 계산 (인접 레인 간 거리)
    this.laneWidth = width * (LANE_POSITIONS[1] - LANE_POSITIONS[0]);

    // 운석 반지름: 레인 너비의 절반에서 margin 제외
    this.meteorRadius = Math.round((this.laneWidth / 2) * (1 - METEOR_MARGIN));
    this.playerSize = Math.max(72, Math.round(this.meteorRadius * PLAYER_SIZE_FACTOR));
    this.playerEdgePadding = Math.max(30, Math.round(this.playerSize * 0.45));

    this.playerY = Math.round(height * 0.85);
    this.collisionLineY = this.playerY; // 판정 라인 = 플레이어 Y
    this.meteorStartY = -this.meteorRadius - 10;
    this.baseSpeed = height / 3000; // 3초에 화면 통과 (기본)
  }

  private resetGameState(): void {
    this.score = 0;
    // lives는 LivesManager에서 관리
    this.turnCount = 0;
    this.successfulHits = 0;
    this.playerX = Math.round(this.scale.width / 2);
    this.isPlaying = false;
    this.isPointerDown = false;
    this.hasCollidedThisWave = false;
    this.meteors = [];
    this.difficultyLevels = createInitialDifficultyLevels();
    this.difficultyUpgradeHistory = [];
    this.currentSpeedMultiplier = 1;
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
    if (!this.laneLines || !this.laneLines.scene) {
      this.laneLines = this.add.graphics();
    }
    this.laneLines.clear();
    this.laneLines.lineStyle(1, BASE_COLORS.LANE_LINE, 0.3);

    for (let i = 1; i < LANE_POSITIONS.length; i++) {
      const x = Math.round(width * ((LANE_POSITIONS[i - 1] + LANE_POSITIONS[i]) / 2));
      this.laneLines.lineBetween(x, 60, x, height - 50);
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
    this.playerBody = this.add
      .image(0, 0, TEXTURE_KEYS.ship)
      .setDisplaySize(this.playerSize, this.playerSize);
    this.player.add(this.playerBody);
    this.player.setDepth(DEPTH_PLAYER);
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
    const clampedX = Phaser.Math.Clamp(x, this.playerEdgePadding, width - this.playerEdgePadding);
    this.playerX = Math.round(clampedX);
    this.player.x = this.playerX;
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

    const round = this.turnCount + 1;
    const roundDifficulty = resolveRoundDifficulty(round, this.difficultyLevels);
    this.currentSpeedMultiplier = roundDifficulty.speedMultiplier;

    // 운석 생성
    const meteorData = generateMeteors(roundDifficulty.generationConfig);

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
    const trailOffsetY = -Math.round(this.meteorRadius * METEOR_FLAME_VERTICAL_OFFSET_FACTOR);
    const trailWidth = Math.round(this.meteorRadius * METEOR_FLAME_WRAP_WIDTH_FACTOR);
    const trailHeight = Math.round(this.meteorRadius * METEOR_FLAME_WRAP_HEIGHT_FACTOR);
    const coreSize = Math.round(this.meteorRadius * METEOR_CORE_DISPLAY_FACTOR);

    const container = this.add.container(x, y);
    container.setDepth(DEPTH_METEOR);

    const trail = this.add
      .image(0, trailOffsetY, TRAIL_TEXTURE_ORDER[0])
      .setDisplaySize(trailWidth, trailHeight)
      .setAlpha(0.9)
      .setBlendMode(Phaser.BlendModes.ADD);

    const core = this.add.image(0, 0, TEXTURE_KEYS.meteorCore).setDisplaySize(coreSize, coreSize);

    // 숫자 텍스트 (Cherry Bomb One 폰트)
    const fontSize = Math.max(18, Math.floor(this.meteorRadius * 0.75));
    const strokeThickness = Math.max(3, Math.round(fontSize * 0.11));
    const label = this.add
      .text(0, 0, data.value.toString(), {
        fontSize: `${fontSize}px`,
        fontFamily: FONTS.NUMBER,
        color: '#ffffff',
        stroke: '#14314f',
        strokeThickness,
      })
      .setOrigin(0.5)
      .setResolution(this.getTextResolution());

    label.setShadow(
      0,
      2,
      METEOR_LABEL_SHADOW_COLOR,
      Math.max(2, Math.round(fontSize * 0.08)),
      false,
      true,
    );

    container.add([trail, core, label]);

    return {
      data,
      container,
      core,
      label,
      trail,
      y,
      trailFrameIndex: 0,
      trailElapsedMs: 0,
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
    const currentSpeed = this.baseSpeed * this.currentSpeedMultiplier;

    this.meteors.forEach((meteor) => {
      this.updateMeteorTrail(meteor, delta);

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

  private updateMeteorTrail(meteor: MeteorSprite, delta: number): void {
    meteor.trailElapsedMs += delta;
    if (meteor.trailElapsedMs < TRAIL_SWAP_INTERVAL_MS) {
      return;
    }

    const steps = Math.floor(meteor.trailElapsedMs / TRAIL_SWAP_INTERVAL_MS);
    meteor.trailElapsedMs -= steps * TRAIL_SWAP_INTERVAL_MS;

    if (steps % 2 === 1) {
      meteor.trailFrameIndex = meteor.trailFrameIndex === 0 ? 1 : 0;
      meteor.trail.setTexture(TRAIL_TEXTURE_ORDER[meteor.trailFrameIndex]);
    }
  }

  private refreshMeteorSpriteLayout(meteor: MeteorSprite): void {
    meteor.container.x = this.laneXPositions[meteor.data.lane];
    meteor.container.y = Math.round(meteor.y);

    const trailOffsetY = -Math.round(this.meteorRadius * METEOR_FLAME_VERTICAL_OFFSET_FACTOR);
    const trailWidth = Math.round(this.meteorRadius * METEOR_FLAME_WRAP_WIDTH_FACTOR);
    const trailHeight = Math.round(this.meteorRadius * METEOR_FLAME_WRAP_HEIGHT_FACTOR);
    const coreSize = Math.round(this.meteorRadius * METEOR_CORE_DISPLAY_FACTOR);
    const splitSize = Math.round(this.meteorRadius * METEOR_SPLIT_DISPLAY_FACTOR);
    const fontSize = Math.max(18, Math.floor(this.meteorRadius * 0.75));
    const strokeThickness = Math.max(3, Math.round(fontSize * 0.11));

    if (meteor.trail.scene) {
      meteor.trail.y = trailOffsetY;
      meteor.trail.setDisplaySize(trailWidth, trailHeight);
    }

    meteor.core.setDisplaySize(
      meteor.label.visible ? coreSize : splitSize,
      meteor.label.visible ? coreSize : splitSize,
    );

    meteor.label.setStyle({
      fontSize: `${fontSize}px`,
      strokeThickness,
    });
    meteor.label.setShadow(
      0,
      2,
      METEOR_LABEL_SHADOW_COLOR,
      Math.max(2, Math.round(fontSize * 0.08)),
      false,
      true,
    );
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
          const shouldDestroyImmediately = this.handleCollision(meteor);
          if (shouldDestroyImmediately) {
            meteor.container.destroy();
          }
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

  private handleCollision(meteor: MeteorSprite): boolean {
    const { type } = meteor.data;

    if (isSuccessMeteor(type)) {
      const earnedScore = 200;
      this.score += earnedScore;
      this.successfulHits++;
      this.showSuccessScorePopup(meteor, earnedScore);
      this.playMedianHitSprite(meteor);

      if (this.successfulHits > 0 && this.successfulHits % ROUND_UPGRADE_INTERVAL === 0) {
        this.applyDifficultyUpgrade();
      }

      this.topBar.updateValue('right', this.score);
      return false;
    } else {
      this.applyDifficultyDowngradeOnFail();
      const isGameOver = this.topBar.loseLife('left');
      this.showFailEffect();

      if (isGameOver) {
        this.endGame();
        return true;
      }
    }

    this.topBar.updateValue('right', this.score);
    return true;
  }

  private showSuccessScorePopup(meteor: MeteorSprite, score: number): void {
    const popup = this.add
      .text(meteor.container.x, meteor.container.y, `+${score}`, {
        fontSize: '24px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#ffc947',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH_EFFECT + 10);

    this.tweens.add({
      targets: popup,
      y: popup.y - 40,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => popup.destroy(),
    });
  }

  private playMedianHitSprite(meteor: MeteorSprite): void {
    meteor.trail.destroy();
    meteor.label.setVisible(false);
    meteor.core.setTexture(TEXTURE_KEYS.meteorSplitHit);
    const splitSize = Math.round(this.meteorRadius * METEOR_SPLIT_DISPLAY_FACTOR);
    meteor.core.setDisplaySize(splitSize, splitSize);

    this.time.delayedCall(MEDIAN_HIT_DURATION_MS, () => {
      meteor.container.destroy();
    });
  }

  private applyDifficultyUpgrade(): void {
    const upgradeResult = upgradeDifficulty(this.difficultyLevels, this.difficultyUpgradeHistory);
    this.difficultyLevels = upgradeResult.levels;
    this.difficultyUpgradeHistory = upgradeResult.history;
  }

  private applyDifficultyDowngradeOnFail(): void {
    const downgradeResult = downgradeDifficultyOnFail(this.difficultyLevels);
    this.difficultyLevels = downgradeResult.levels;
  }

  private showFailEffect(): void {
    const { width, height } = this.scale;

    // 화면 빨간색 플래시
    const flash = this.add
      .rectangle(0, 0, width, height, THEME.failFlash, 0.3)
      .setOrigin(0, 0)
      .setDepth(DEPTH_EFFECT);

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
    this.createLaneLines(width, height);

    this.topBar?.handleResize(width);

    if (this.player) {
      this.playerX = Math.round(
        Phaser.Math.Clamp(this.playerX, this.playerEdgePadding, width - this.playerEdgePadding),
      );
      this.player.x = this.playerX;
      this.player.y = this.playerY;
      this.playerBody?.setDisplaySize(this.playerSize, this.playerSize);
    }

    this.meteors.forEach((meteor) => this.refreshMeteorSpriteLayout(meteor));
  }

  private cleanupResizeListener(): void {
    this.scale.off('resize', this.handleResize, this);
    this.laneLines = undefined;
  }
}