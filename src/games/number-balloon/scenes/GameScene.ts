import Phaser from 'phaser';
import { BalloonData, generateBalloons, getCorrectOrder } from '../utils/BalloonGenerator';
import {
  DifficultyAxis,
  DifficultyAxisLevels,
  DifficultyDowngradeReason,
  ROUND_UPGRADE_INTERVAL,
  createInitialDifficultyLevels,
  downgradeDifficultyOnFail,
  resolveRoundDifficulty,
  upgradeDifficulty,
} from '../utils/DifficultyDirector';
import { showStartScreen } from '../../../shared/ui';
import { TopBar, TOP_BAR } from '../../../shared/topBar';
import { FONTS } from '../../../shared/constants';

const COLORS = {
  BG_SKY: 0x87ceeb,
  TEXT_PRIMARY: '#ffffff',
  TEXT_DARK: '#2c3e50',
  TEXT_SECONDARY: '#7f8c8d',
  SUCCESS: 0x4ecca3,
  FAIL: 0xe94560,
  TIME_WARNING: '#c0392b',
  TIME_NORMAL: '#2c3e50',
} as const;

const BALLOON_PHYSICS = {
  RESTITUTION: 0.8,
  FRICTION: 0,
  FRICTION_AIR: 0.01,
  INITIAL_SPEED: 1.5,
} as const;

const TIMER_BAR = {
  HEIGHT: 12,
  TOP_OFFSET: 10,
  SIDE_PADDING: 16,
  MAX_WIDTH: 520,
} as const;

const TIMER_BAR_COLORS = {
  NORMAL: 0x4ecca3,
  WARNING: 0xffc947,
  DANGER: 0xe94560,
  BACKGROUND: 0x000000,
} as const;

interface BalloonBody {
  data: BalloonData;
  body: MatterJS.BodyType;
  graphics: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  isPopped: boolean;
}

export class GameScene extends Phaser.Scene {
  private score = 0;
  private round = 1;
  private totalPopped = 0;
  private successfulRounds = 0;
  private isPlaying = false;

  private difficultyLevels: DifficultyAxisLevels = createInitialDifficultyLevels();
  private difficultyUpgradeHistory: DifficultyAxis[] = [];

  private roundTimeLimit = 0;
  private roundTimeLeft = 0;
  private roundTimerEvent?: Phaser.Time.TimerEvent;

  private balloons: BalloonData[] = [];
  private balloonBodies: BalloonBody[] = [];
  private correctOrder: number[] = [];
  private currentIndex = 0;

  private topBar!: TopBar;
  private instructionText!: Phaser.GameObjects.Text;
  private timerBarBg!: Phaser.GameObjects.Rectangle;
  private timerBarFill!: Phaser.GameObjects.Rectangle;
  private timerBarWidth = 0;
  private timerBarY = 0;

  private gameAreaWidth = 0;
  private gameAreaHeight = 0;
  private gameAreaTop = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.score = 0;
    this.round = 1;
    this.totalPopped = 0;
    this.successfulRounds = 0;
    this.isPlaying = false;

    this.difficultyLevels = createInitialDifficultyLevels();
    this.difficultyUpgradeHistory = [];

    this.balloonBodies = [];
    this.currentIndex = 0;
    this.roundTimeLimit = 0;
    this.roundTimeLeft = 0;

    this.calculateLayout(width, height);
    this.createBackground(width, height);

    this.createHUD();

    this.instructionText = this.add
      .text(width / 2, this.gameAreaTop - 30, '작은 숫자부터 순서대로 터치!', {
        fontSize: '18px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_DARK,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.setupWorldBounds(width, height);

    showStartScreen(this, {
      title: '숫자 풍선을 순서대로 터치하세요!',
      subtitle: '작은 숫자부터 터치하면 성공',
      onStart: () => this.startGame(),
    });

    this.scale.on('resize', this.handleResize, this);
  }

  update(): void {
    this.balloonBodies.forEach((balloon) => {
      if (balloon.isPopped) {
        return;
      }

      const x = balloon.body.position.x;
      const y = balloon.body.position.y;
      balloon.graphics.setPosition(x, y + this.gameAreaTop);
      balloon.text.setPosition(x, y + this.gameAreaTop);
    });
  }

  private calculateLayout(width: number, height: number): void {
    const hudHeight = TOP_BAR.HEIGHT;
    const difficultyHeight = 30;
    const instructionHeight = 40;

    this.gameAreaTop = hudHeight + difficultyHeight + instructionHeight;
    this.gameAreaWidth = width;
    this.gameAreaHeight = height - this.gameAreaTop - 20;
  }

  private setupWorldBounds(width: number, _height: number): void {
    const wallThickness = 50;
    this.matter.world.setBounds(
      0,
      0,
      width,
      this.gameAreaHeight,
      wallThickness,
      true,
      true,
      true,
      true
    );
  }

  private createBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xb0e0e6, 0xb0e0e6);
    bg.fillRect(0, 0, width, height);

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

  private createHUD(): void {
    this.topBar = new TopBar(this, {
      left: { type: 'lives', maxLives: 3 },
      right: { type: 'score', initialValue: 0, color: COLORS.TEXT_DARK },
    });

    this.topBar.setAlpha(0);
    this.createTimerBar(this.scale.width);
    this.setTimerBarAlpha(0);
  }

  private createTimerBar(width: number): void {
    this.timerBarWidth = Math.min(width - TIMER_BAR.SIDE_PADDING * 2, TIMER_BAR.MAX_WIDTH);
    this.timerBarY = TOP_BAR.HEIGHT + TIMER_BAR.TOP_OFFSET;
    const leftX = (width - this.timerBarWidth) / 2;

    this.timerBarBg = this.add
      .rectangle(width / 2, this.timerBarY, this.timerBarWidth, TIMER_BAR.HEIGHT, TIMER_BAR_COLORS.BACKGROUND, 0.25)
      .setDepth(110);

    this.timerBarFill = this.add
      .rectangle(leftX, this.timerBarY, this.timerBarWidth, TIMER_BAR.HEIGHT, TIMER_BAR_COLORS.NORMAL, 0.95)
      .setOrigin(0, 0.5)
      .setDepth(111);
  }

  private setTimerBarAlpha(alpha: number): void {
    this.timerBarBg?.setAlpha(alpha);
    this.timerBarFill?.setAlpha(alpha);
  }

  private updateTimerBar(): void {
    if (!this.timerBarFill) {
      return;
    }

    const maxMs = this.roundTimeLimit * 1000;
    const ratio = maxMs > 0 ? Phaser.Math.Clamp(this.roundTimeLeft / maxMs, 0, 1) : 0;
    this.timerBarFill.displayWidth = this.timerBarWidth * ratio;

    const color =
      ratio <= 0.3
        ? TIMER_BAR_COLORS.DANGER
        : ratio <= 0.6
          ? TIMER_BAR_COLORS.WARNING
          : TIMER_BAR_COLORS.NORMAL;
    this.timerBarFill.setFillStyle(color, 0.95);
  }

  private handleTimerBarResize(width: number): void {
    this.timerBarWidth = Math.min(width - TIMER_BAR.SIDE_PADDING * 2, TIMER_BAR.MAX_WIDTH);
    this.timerBarY = TOP_BAR.HEIGHT + TIMER_BAR.TOP_OFFSET;
    const leftX = (width - this.timerBarWidth) / 2;

    this.timerBarBg
      ?.setPosition(width / 2, this.timerBarY)
      .setSize(this.timerBarWidth, TIMER_BAR.HEIGHT);

    this.timerBarFill?.setPosition(leftX, this.timerBarY);
    this.updateTimerBar();
  }

  private prepareRound(): void {
    this.roundTimerEvent?.destroy();

    this.balloonBodies.forEach((balloon) => {
      this.matter.world.remove(balloon.body);
      balloon.graphics.destroy();
      balloon.text.destroy();
    });

    this.balloonBodies = [];
    this.currentIndex = 0;

    const roundDifficulty = resolveRoundDifficulty(this.round, this.difficultyLevels);
    this.balloons = generateBalloons(roundDifficulty.generationConfig, this.gameAreaWidth, this.gameAreaHeight);
    this.correctOrder = getCorrectOrder(this.balloons);

    this.createBalloonBodies();

    this.roundTimeLimit = roundDifficulty.timeLimit;
    this.roundTimeLeft = this.roundTimeLimit * 1000;
    this.updateTimerBar();

    this.startRoundTimer();
  }

  private createBalloonBodies(): void {
    this.balloons.forEach((data) => {
      const balloonBody = this.createBalloonBody(data);
      this.balloonBodies.push(balloonBody);
    });
  }

  private createBalloonBody(data: BalloonData): BalloonBody {
    const body = this.matter.add.circle(data.x, data.y, data.size, {
      restitution: BALLOON_PHYSICS.RESTITUTION,
      friction: BALLOON_PHYSICS.FRICTION,
      frictionAir: BALLOON_PHYSICS.FRICTION_AIR,
      label: `balloon_${data.id}`,
    });

    const speed = BALLOON_PHYSICS.INITIAL_SPEED;
    const angle = Math.random() * Math.PI * 2;
    this.matter.body.setVelocity(body, {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
    });

    const graphics = this.add.graphics();
    this.drawBalloon(graphics, data);
    graphics.setPosition(data.x, data.y + this.gameAreaTop);

    const fontSize = Math.max(data.size * 0.85, 28);
    const text = this.add
      .text(data.x, data.y + this.gameAreaTop, String(data.value), {
        fontSize: `${fontSize}px`,
        fontFamily: FONTS.NUMBER,
        color: '#ffffff',
      })
      .setOrigin(0.5);

    graphics.setInteractive(new Phaser.Geom.Circle(0, 0, data.size), Phaser.Geom.Circle.Contains);

    const balloonBody: BalloonBody = {
      data,
      body,
      graphics,
      text,
      isPopped: false,
    };

    graphics.on('pointerdown', () => {
      if (!this.isPlaying || balloonBody.isPopped) {
        return;
      }

      this.onBalloonTap(balloonBody);
    });

    return balloonBody;
  }

  private drawBalloon(graphics: Phaser.GameObjects.Graphics, data: BalloonData): void {
    graphics.fillStyle(data.color, 1);
    graphics.fillCircle(0, 0, data.size);

    graphics.fillStyle(0xffffff, 0.3);
    graphics.fillCircle(-data.size * 0.3, -data.size * 0.3, data.size * 0.25);

    graphics.fillStyle(data.color, 1);
    graphics.fillTriangle(-5, data.size, 5, data.size, 0, data.size + 15);

    graphics.lineStyle(2, 0x888888, 0.8);
    graphics.lineBetween(0, data.size + 15, 0, data.size + 40);
  }

  private onBalloonTap(balloon: BalloonBody): void {
    const expectedId = this.correctOrder[this.currentIndex];

    if (balloon.data.id === expectedId) {
      this.handleCorrectTap(balloon);
      return;
    }

    this.handleWrongTap(balloon);
  }

  private handleCorrectTap(balloon: BalloonBody): void {
    balloon.isPopped = true;
    this.currentIndex++;
    this.totalPopped++;

    const points = 10 * this.round;
    this.score += points;
    this.topBar.updateValue('right', this.score);

    this.popBalloon(balloon, true);

    if (this.currentIndex >= this.balloons.length) {
      this.handleRoundClear();
    }
  }

  private handleWrongTap(balloon: BalloonBody): void {
    this.applyDifficultyDowngradeOnFail('wrongTap');

    const isGameOver = this.topBar.loseLife('left');
    this.showWrongFeedback(balloon);

    if (isGameOver) {
      this.roundTimerEvent?.destroy();
      this.time.delayedCall(500, () => {
        this.endGame();
      });
    }
  }

  private popBalloon(balloon: BalloonBody, success: boolean): void {
    const { graphics, text, body, data } = balloon;
    const x = graphics.x;
    const y = graphics.y;

    this.matter.world.remove(body);

    const particles = this.add.graphics();
    particles.fillStyle(data.color, 0.8);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 20;
      particles.fillCircle(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 5);
    }

    this.tweens.add({
      targets: particles,
      alpha: 0,
      duration: 300,
      onComplete: () => particles.destroy(),
    });

    this.tweens.add({
      targets: [graphics, text],
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 150,
      ease: 'Quad.easeOut',
      onComplete: () => {
        graphics.destroy();
        text.destroy();
      },
    });

    if (!success) {
      return;
    }

    const points = 10 * this.round;
    const pointsText = this.add
      .text(x, y, `+${points}`, {
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

  private showWrongFeedback(balloon: BalloonBody): void {
    this.cameras.main.shake(200, 0.01);

    const pushForce = 0.05;
    const angle = Math.random() * Math.PI * 2;
    this.matter.body.applyForce(balloon.body, balloon.body.position, {
      x: Math.cos(angle) * pushForce,
      y: Math.sin(angle) * pushForce,
    });

    const xMark = this.add
      .text(balloon.graphics.x, balloon.graphics.y, 'X', {
        fontSize: '40px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#e94560',
        fontStyle: 'bold',
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

  private handleRoundClear(): void {
    this.roundTimerEvent?.destroy();

    this.successfulRounds++;
    if (this.successfulRounds > 0 && this.successfulRounds % ROUND_UPGRADE_INTERVAL === 0) {
      this.applyDifficultyUpgrade();
    }

    this.round++;

    const clearText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Clear!', {
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
      },
    });
  }

  private applyDifficultyUpgrade(): void {
    const upgradeResult = upgradeDifficulty(this.difficultyLevels, this.difficultyUpgradeHistory);
    this.difficultyLevels = upgradeResult.levels;
    this.difficultyUpgradeHistory = upgradeResult.history;
  }

  private applyDifficultyDowngradeOnFail(reason: DifficultyDowngradeReason): void {
    const downgradeResult = downgradeDifficultyOnFail(this.difficultyLevels, reason);
    this.difficultyLevels = downgradeResult.levels;
  }

  private startGame(): void {
    this.isPlaying = true;

    this.topBar.setAlpha(1);
    this.instructionText.setAlpha(1);
    this.setTimerBarAlpha(1);

    this.prepareRound();
  }

  private startRoundTimer(): void {
    if (!this.isPlaying) {
      return;
    }

    this.roundTimerEvent = this.time.addEvent({
      delay: 100,
      callback: this.updateRoundTimer,
      callbackScope: this,
      loop: true,
    });
  }

  private updateRoundTimer(): void {
    if (!this.isPlaying) {
      return;
    }

    this.roundTimeLeft -= 100;
    this.updateTimerBar();

    if (this.roundTimeLeft <= 0) {
      this.handleTimeOut();
    }
  }

  private handleTimeOut(): void {
    this.roundTimerEvent?.destroy();

    this.applyDifficultyDowngradeOnFail('timeout');

    const isGameOver = this.topBar.loseLife('left');
    this.showTimeOutFeedback();

    if (isGameOver) {
      this.time.delayedCall(800, () => {
        this.endGame();
      });
      return;
    }

    this.time.delayedCall(800, () => {
      if (this.isPlaying) {
        this.prepareRound();
      }
    });
  }

  private showTimeOutFeedback(): void {
    const { width, height } = this.scale;

    this.cameras.main.shake(200, 0.01);

    const text = this.add
      .text(width / 2, height / 2, '시간 초과!', {
        fontSize: '36px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#e94560',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 200,
      yoyo: true,
      hold: 400,
      onComplete: () => text.destroy(),
    });
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
    this.setupWorldBounds(width, height);

    this.topBar?.handleResize(width);
    this.handleTimerBarResize(width);
  }
}

