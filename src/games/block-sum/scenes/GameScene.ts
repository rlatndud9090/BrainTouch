import Phaser from 'phaser';
import { BlockData, RoundData, generateRound, canAchieveTarget, calculateSum } from '../utils/BlockGenerator';
import {
  DifficultyAxis,
  DifficultyAxisLevels,
  RoundTelemetryEntry,
  ROUND_UPGRADE_INTERVAL,
  createInitialDifficultyLevels,
  resolveRoundDifficulty,
  upgradeDifficulty,
  getDifficultyName,
  getDifficultyScore,
  getScoreMultiplier,
  summarizeDifficultyMetrics,
} from '../utils/DifficultyDirector';
import { BASE_COLORS, THEME_PRESETS, COLORFUL_PALETTE } from '../../../shared/colors';
import { createGradientBackground, showStartScreen } from '../../../shared/ui';
import { TopBar } from '../../../shared/topBar';
import { FONTS } from '../../../shared/constants';

const COLORS = {
  ...BASE_COLORS,
  ACCENT: THEME_PRESETS.blockSum.accent,
  ACCENT_HOVER: THEME_PRESETS.blockSum.accentHover,
  ACCENT_TEXT: THEME_PRESETS.blockSum.accentText,
  BLOCK_SELECTED: 0x6a6a8e,
};

const BLOCK_COLORS = COLORFUL_PALETTE;

interface BlockSprite {
  data: BlockData;
  container: Phaser.GameObjects.Container;
  isRemoving: boolean;
}

export class GameScene extends Phaser.Scene {
  private score = 0;
  private clearedRounds = 0;
  private isPlaying = false;
  private isAnimating = false;

  private difficultyLevels: DifficultyAxisLevels = createInitialDifficultyLevels();
  private difficultyUpgradeHistory: DifficultyAxis[] = [];
  private currentDifficultyScore = 0;
  private maxDifficultyScore = 0;
  private maxDifficultyName = '하';

  private consecutiveFails = 0;
  private pendingAssistRound = false;
  private assistAppliedThisRound = false;

  private roundTimeLimit = 0;
  private roundTimeLeft = 0;
  private roundTimerEvent?: Phaser.Time.TimerEvent;

  private currentRoundNumber = 1;
  private currentRound!: RoundData;
  private blockSprites: BlockSprite[] = [];
  private roundStartedAt = 0;
  private roundOutcomeRecorded = false;
  private telemetryEntries: RoundTelemetryEntry[] = [];

  private topBar!: TopBar;
  private targetLabel!: Phaser.GameObjects.Text;
  private targetText!: Phaser.GameObjects.Text;
  private blockContainer!: Phaser.GameObjects.Container;

  private selectedBlock: BlockSprite | null = null;
  private swipeStartX = 0;
  private swipeStartY = 0;
  private swipeStartTime = 0;
  private readonly SWIPE_SPEED_THRESHOLD = 0.8;
  private readonly SWIPE_MIN_DISTANCE = 30;

  private blockWidth = 0;
  private blockHeight = 0;
  private blockGap = 8;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.score = 0;
    this.clearedRounds = 0;
    this.isPlaying = false;
    this.isAnimating = false;

    this.difficultyLevels = createInitialDifficultyLevels();
    this.difficultyUpgradeHistory = [];
    this.currentDifficultyScore = getDifficultyScore(this.difficultyLevels);
    this.maxDifficultyScore = this.currentDifficultyScore;
    this.maxDifficultyName = getDifficultyName(this.difficultyLevels);

    this.consecutiveFails = 0;
    this.pendingAssistRound = false;
    this.assistAppliedThisRound = false;

    this.roundTimeLimit = 0;
    this.roundTimeLeft = 0;
    this.currentRoundNumber = 1;
    this.roundStartedAt = 0;
    this.roundOutcomeRecorded = false;
    this.blockSprites = [];
    this.telemetryEntries = [];

    this.calculateLayout(width, height);
    createGradientBackground(this, width, height);

    const firstRoundDifficulty = resolveRoundDifficulty(1, this.difficultyLevels, false);
    this.createHUD(firstRoundDifficulty.timeLimit);
    this.createTargetArea(width, height);

    this.blockContainer = this.add.container(width / 2, height * 0.5);
    this.blockContainer.setAlpha(0);
    this.targetLabel.setAlpha(0);
    this.targetText.setAlpha(0);

    this.setupGlobalSwipeDetection();

    showStartScreen(this, {
      title: '🧱 블록을 스와이프로 제거하세요!',
      subtitle: '남은 블록의 합이 목표 숫자가 되도록',
      onStart: () => this.startGame(),
    });

    this.scale.on('resize', this.handleResize, this);
  }

  private calculateLayout(width: number, height: number): void {
    this.blockWidth = Math.min(width * 0.525, 210);
    this.blockHeight = Math.min(height * 0.12, 90);
  }

  private setupGlobalSwipeDetection(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.selectedBlock || !this.isPlaying || this.isAnimating) return;

      const dx = pointer.x - this.swipeStartX;
      const dy = pointer.y - this.swipeStartY;
      const elapsed = pointer.time - this.swipeStartTime;

      if (Math.abs(dx) <= Math.abs(dy)) return;
      if (Math.abs(dx) < this.SWIPE_MIN_DISTANCE) return;

      const speed = Math.abs(dx) / Math.max(elapsed, 1);
      if (speed >= this.SWIPE_SPEED_THRESHOLD) {
        const direction = dx > 0 ? 'right' : 'left';
        this.removeBlock(this.selectedBlock, direction);
        this.selectedBlock = null;
      }
    });

    this.input.on('pointerup', () => {
      if (!this.selectedBlock) return;

      const container = this.selectedBlock.container as any;
      const bg = container.bgGraphics as Phaser.GameObjects.Graphics;
      const originalColor = container.originalColor;

      if (bg && originalColor !== undefined) {
        const radius = 16;
        bg.clear();
        bg.fillStyle(originalColor, 1);
        bg.fillRoundedRect(
          -this.blockWidth / 2,
          -this.blockHeight / 2,
          this.blockWidth,
          this.blockHeight,
          radius
        );
      }

      this.selectedBlock = null;
    });
  }

  private createHUD(initialTimeLimit: number): void {
    this.topBar = new TopBar(this, {
      left: { type: 'lives', maxLives: 3 },
      center: { type: 'time', initialValue: initialTimeLimit, color: COLORS.ACCENT_TEXT },
      right: { type: 'score', initialValue: 0 },
    });

    this.topBar.setAlpha(0);
  }

  private createTargetArea(width: number, height: number): void {
    const targetY = height * 0.15;

    this.targetLabel = this.add
      .text(width / 2, targetY - 25, '목표', {
        fontSize: '18px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5);

    this.targetText = this.add
      .text(width / 2, targetY + 15, '0', {
        fontSize: '56px',
        fontFamily: FONTS.NUMBER,
        color: COLORS.ACCENT_TEXT,
      })
      .setOrigin(0.5);
  }

  private prepareRound(): void {
    this.isAnimating = false;
    this.roundTimerEvent?.destroy();

    this.blockSprites.forEach((bs) => bs.container.destroy());
    this.blockSprites = [];

    this.currentRoundNumber = this.clearedRounds + 1;
    const roundDifficulty = resolveRoundDifficulty(
      this.currentRoundNumber,
      this.difficultyLevels,
      this.pendingAssistRound
    );

    this.pendingAssistRound = false;
    this.assistAppliedThisRound = roundDifficulty.assistApplied;
    this.currentDifficultyScore = roundDifficulty.difficultyScore;
    this.trackMaxDifficulty(roundDifficulty.difficultyScore, roundDifficulty.difficultyName);

    if (this.assistAppliedThisRound) {
      this.showAssistFeedback();
    }

    this.currentRound = generateRound(roundDifficulty.generationConfig);
    this.targetText.setText(String(this.currentRound.targetSum));

    this.createBlocks();

    this.roundTimeLimit = roundDifficulty.timeLimit;
    this.roundTimeLeft = this.roundTimeLimit * 1000;
    this.topBar.updateValue('center', this.roundTimeLimit);
    this.topBar.setColor('center', COLORS.ACCENT_TEXT);

    this.roundStartedAt = this.time.now;
    this.roundOutcomeRecorded = false;
    this.startRoundTimer();
  }

  private createBlocks(): void {
    const blocks = this.currentRound.blocks;
    const totalHeight = blocks.length * (this.blockHeight + this.blockGap) - this.blockGap;
    const startY = -totalHeight / 2 + this.blockHeight / 2;

    blocks.forEach((blockData, index) => {
      const y = startY + index * (this.blockHeight + this.blockGap);
      const blockSprite = this.createBlockSprite(blockData, 0, y, index);
      this.blockSprites.push(blockSprite);
      this.blockContainer.add(blockSprite.container);
    });
  }

  private createBlockSprite(
    data: BlockData,
    x: number,
    y: number,
    colorIndex: number
  ): BlockSprite {
    const container = this.add.container(x, y);
    const blockColor = BLOCK_COLORS[colorIndex % BLOCK_COLORS.length];
    const radius = 16;

    const bg = this.add.graphics();
    bg.fillStyle(blockColor, 1);
    bg.fillRoundedRect(
      -this.blockWidth / 2,
      -this.blockHeight / 2,
      this.blockWidth,
      this.blockHeight,
      radius
    );

    const hitArea = this.add
      .rectangle(0, 0, this.blockWidth, this.blockHeight, 0x000000, 0)
      .setInteractive({ useHandCursor: true, draggable: false });

    const text = this.add
      .text(0, 0, String(data.value), {
        fontSize: '44px',
        fontFamily: FONTS.NUMBER,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    text.setShadow(2, 2, 'rgba(0,0,0,0.3)', 4);

    container.add([bg, hitArea, text]);
    container.setSize(this.blockWidth, this.blockHeight);

    const blockSprite: BlockSprite = {
      data,
      container,
      isRemoving: false,
    };

    hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPlaying || this.isAnimating || blockSprite.isRemoving) return;

      this.selectedBlock = blockSprite;
      this.swipeStartX = pointer.x;
      this.swipeStartY = pointer.y;
      this.swipeStartTime = pointer.time;

      bg.clear();
      bg.fillStyle(COLORS.BLOCK_SELECTED, 1);
      bg.fillRoundedRect(
        -this.blockWidth / 2,
        -this.blockHeight / 2,
        this.blockWidth,
        this.blockHeight,
        radius
      );
    });

    (container as any).originalColor = blockColor;
    (container as any).bgGraphics = bg;

    return blockSprite;
  }

  private removeBlock(blockSprite: BlockSprite, direction: 'left' | 'right' = 'left'): void {
    if (blockSprite.isRemoving) return;
    blockSprite.isRemoving = true;

    const index = this.blockSprites.indexOf(blockSprite);
    if (index === -1) return;

    const targetX = direction === 'left' ? -this.blockWidth - 50 : this.blockWidth + 50;

    this.tweens.add({
      targets: blockSprite.container,
      x: targetX,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.blockSprites.splice(index, 1);
        blockSprite.container.destroy();
        this.checkAutoSuccess();
      },
    });
  }

  private checkAutoSuccess(): void {
    const remainingBlocks = this.blockSprites.filter((bs) => !bs.isRemoving).map((bs) => bs.data);
    const currentSum = calculateSum(remainingBlocks);

    if (currentSum === this.currentRound.targetSum) {
      this.handleRoundSuccess(remainingBlocks.length);
      return;
    }

    if (!canAchieveTarget(remainingBlocks, this.currentRound.targetSum)) {
      this.handleRoundFail();
    }
  }

  private handleRoundSuccess(remainingBlockCount: number): void {
    if (this.isAnimating) return;

    this.roundTimerEvent?.destroy();
    this.isAnimating = true;
    this.recordRoundOutcome('success');

    this.clearedRounds++;
    this.consecutiveFails = 0;

    const baseScore = 100;
    const bonusMultiplier = remainingBlockCount;
    const difficultyBonus = getScoreMultiplier(this.currentDifficultyScore);
    const roundScore = Math.round(baseScore * bonusMultiplier * difficultyBonus);

    this.score += roundScore;
    this.topBar.updateValue('right', this.score);

    if (this.clearedRounds > 0 && this.clearedRounds % ROUND_UPGRADE_INTERVAL === 0) {
      this.applyDifficultyUpgrade();
    }

    this.showSuccessFeedback(() => {
      if (this.isPlaying) {
        this.prepareRound();
      }
    });
  }

  private handleRoundFail(): void {
    if (this.isAnimating) return;

    this.roundTimerEvent?.destroy();
    this.isAnimating = true;
    this.recordRoundOutcome('fail');

    this.consecutiveFails++;
    if (this.consecutiveFails >= 2) {
      this.pendingAssistRound = true;
    }

    const isGameOver = this.topBar.loseLife('left');
    this.showFailFeedback();

    if (isGameOver) {
      this.time.delayedCall(500, () => {
        this.endGame();
      });
      return;
    }

    this.time.delayedCall(500, () => {
      if (this.isPlaying) {
        this.prepareRound();
      }
    });
  }

  private applyDifficultyUpgrade(): void {
    const upgradeResult = upgradeDifficulty(this.difficultyLevels, this.difficultyUpgradeHistory);
    this.difficultyLevels = upgradeResult.levels;
    this.difficultyUpgradeHistory = upgradeResult.history;

    if (upgradeResult.upgradedAxis) {
      this.showDifficultyUpgradeFeedback(upgradeResult.upgradedAxis);
    }

    this.trackMaxDifficulty(
      getDifficultyScore(this.difficultyLevels),
      getDifficultyName(this.difficultyLevels)
    );
  }

  private recordRoundOutcome(outcome: 'success' | 'fail'): void {
    if (this.roundOutcomeRecorded) return;
    this.roundOutcomeRecorded = true;

    const elapsedMs = Math.max(0, this.time.now - this.roundStartedAt);
    this.telemetryEntries.push({
      round: this.currentRoundNumber,
      outcome,
      elapsedMs,
      timeLimitSec: this.roundTimeLimit,
      assistApplied: this.assistAppliedThisRound,
      difficultyScore: this.currentDifficultyScore,
    });
  }

  private trackMaxDifficulty(score: number, name: string): void {
    if (score >= this.maxDifficultyScore) {
      this.maxDifficultyScore = score;
      this.maxDifficultyName = name;
    }
  }

  private showDifficultyUpgradeFeedback(axis: DifficultyAxis): void {
    const { width, height } = this.scale;
    const axisLabel = this.getAxisLabel(axis);

    const text = this.add
      .text(width / 2, height * 0.23, `난이도 상승: ${axisLabel}`, {
        fontSize: '22px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#ffc947',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(250)
      .setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      y: text.y - 8,
      duration: 180,
      yoyo: true,
      hold: 320,
      onComplete: () => text.destroy(),
    });
  }

  private showAssistFeedback(): void {
    const { width, height } = this.scale;

    const text = this.add
      .text(width / 2, height * 0.19, '안전 보정 적용: 이번 라운드 완화', {
        fontSize: '18px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#4ecca3',
      })
      .setOrigin(0.5)
      .setDepth(250)
      .setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 160,
      yoyo: true,
      hold: 400,
      onComplete: () => text.destroy(),
    });
  }

  private getAxisLabel(axis: DifficultyAxis): string {
    switch (axis) {
      case 'blockCount':
        return '블록 수 +1';
      case 'numberRange':
        return '숫자 범위 확장';
      case 'targetComplexity':
        return '목표 복잡도 증가';
      case 'timePressure':
        return '시간 압박 증가';
    }
  }

  private showSuccessFeedback(onComplete?: () => void): void {
    const targetX = this.targetText.x;
    const targetY = this.targetText.y;

    const mark = this.add
      .text(targetX, targetY, '○', {
        fontSize: '80px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#4ecca3',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setAlpha(1);

    this.tweens.add({
      targets: mark,
      alpha: 0,
      duration: 150,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        mark.destroy();
        onComplete?.();
      },
    });

    const thumbX = this.targetText.x + this.targetText.width / 2 + 40;
    const thumbY = this.targetText.y;

    const thumb = this.add
      .text(thumbX - 30, thumbY, '👍', {
        fontSize: '36px',
      })
      .setOrigin(0, 0.5)
      .setDepth(200)
      .setAlpha(0);

    this.tweens.add({
      targets: thumb,
      x: thumbX,
      alpha: 1,
      duration: 250,
      ease: 'Power2',
      onComplete: () => {
        this.tweens.add({
          targets: thumb,
          alpha: 0,
          duration: 100,
          delay: 100,
          onComplete: () => thumb.destroy(),
        });
      },
    });
  }

  private showFailFeedback(): void {
    const { width, height } = this.scale;
    const targetX = this.targetText.x;
    const targetY = this.targetText.y;

    const mark = this.add
      .text(targetX, targetY, '✕', {
        fontSize: '80px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#e94560',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setAlpha(1);

    this.tweens.add({
      targets: mark,
      alpha: 0,
      duration: 200,
      delay: 500,
      onComplete: () => mark.destroy(),
    });

    this.cameras.main.shake(200, 0.01);

    const flashOverlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0xe94560, 0.3)
      .setDepth(1000);

    this.tweens.add({
      targets: flashOverlay,
      alpha: 0,
      duration: 300,
      onComplete: () => flashOverlay.destroy(),
    });
  }

  private startGame(): void {
    this.isPlaying = true;

    this.topBar.setAlpha(1);
    this.blockContainer.setAlpha(1);
    this.targetLabel.setAlpha(1);
    this.targetText.setAlpha(1);

    this.prepareRound();
  }

  private startRoundTimer(): void {
    if (!this.isPlaying) return;

    this.roundTimerEvent = this.time.addEvent({
      delay: 100,
      callback: this.updateRoundTimer,
      callbackScope: this,
      loop: true,
    });
  }

  private updateRoundTimer(): void {
    if (!this.isPlaying) return;

    this.roundTimeLeft -= 100;

    const seconds = Math.max(0, this.roundTimeLeft / 1000);
    this.topBar.updateValue('center', parseFloat(seconds.toFixed(1)));

    if (this.roundTimeLeft <= 3000) {
      this.topBar.setColor('center', '#e94560');
    }

    if (this.roundTimeLeft <= 0) {
      this.roundTimerEvent?.destroy();
      this.handleRoundFail();
    }
  }

  private endGame(): void {
    this.isPlaying = false;

    const metrics = summarizeDifficultyMetrics(this.telemetryEntries);
    console.info('[block-sum][difficulty-metrics]', metrics);

    this.scene.start('ResultScene', {
      score: this.score,
      clearedRounds: this.clearedRounds,
      maxDifficulty: this.maxDifficultyName,
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width } = gameSize;
    this.calculateLayout(width, gameSize.height);
    this.topBar?.handleResize(width);
  }
}
