import Phaser from 'phaser';
import {
  Difficulty,
  BlockData,
  RoundData,
  generateRound,
  canAchieveTarget,
  calculateSum,
  getDifficultyName,
  getNextDifficulty,
} from '../utils/BlockGenerator';
import { BASE_COLORS, THEME_PRESETS, COLORFUL_PALETTE } from '../../../shared/colors';
import { createGradientBackground, showStartScreen } from '../../../shared/ui';
import { TopBar, TOP_BAR } from '../../../shared/topBar';

// 게임 색상
const COLORS = {
  ...BASE_COLORS,
  ACCENT: THEME_PRESETS.blockSum.accent,
  ACCENT_HOVER: THEME_PRESETS.blockSum.accentHover,
  ACCENT_TEXT: THEME_PRESETS.blockSum.accentText,
  BLOCK_SELECTED: 0x6a6a8e,
};

// 블록 색상 팔레트 (공통 팔레트 사용)
const BLOCK_COLORS = COLORFUL_PALETTE;

// 블록 스프라이트 정보
interface BlockSprite {
  data: BlockData;
  container: Phaser.GameObjects.Container;
  isRemoving: boolean;
}

export class GameScene extends Phaser.Scene {
  // 게임 상태
  private score = 0;
  private clearedRounds = 0;
  private difficulty: Difficulty = 'easy';
  private consecutiveSuccess = 0; // 연속 성공 횟수
  private timeLeft = 60000; // 60초
  private isPlaying = false;

  // 현재 라운드
  private currentRound!: RoundData;
  private blockSprites: BlockSprite[] = [];

  // UI 요소
  private topBar!: TopBar;
  private difficultyText!: Phaser.GameObjects.Text;
  private targetText!: Phaser.GameObjects.Text;
  private blockContainer!: Phaser.GameObjects.Container;

  // 스와이프 관련
  private selectedBlock: BlockSprite | null = null;
  private swipeStartX = 0;
  private swipeStartY = 0;
  private swipeStartTime = 0;
  private readonly SWIPE_SPEED_THRESHOLD = 0.8; // px/ms (속도 임계값)
  private readonly SWIPE_MIN_DISTANCE = 30; // 최소 이동 거리

  // 레이아웃
  private blockWidth = 0;
  private blockHeight = 0;
  private blockGap = 8;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // 상태 초기화
    this.score = 0;
    this.clearedRounds = 0;
    this.difficulty = 'easy';
    this.consecutiveSuccess = 0;
    this.timeLeft = 60000;
    this.isPlaying = false;
    this.blockSprites = [];

    // 레이아웃 계산
    this.calculateLayout(width, height);

    // 배경
    createGradientBackground(this, width, height);

    // HUD
    this.createHUD(width);

    // 목표 영역
    this.createTargetArea(width, height);

    // 블록 컨테이너 (확인 버튼 제거로 세로 중앙 배치)
    this.blockContainer = this.add.container(width / 2, height * 0.5);

    // 첫 라운드 준비 (카운트다운 동안 숨김)
    this.prepareRound();
    this.blockContainer.setAlpha(0);
    this.targetText.setAlpha(0);

    // 전역 스와이프 감지 (블록 영역 밖에서 pointerup 되어도 감지)
    this.setupGlobalSwipeDetection();

    // 시작 화면 표시
    showStartScreen(this, {
      title: '🧱 블록을 스와이프로 제거하세요!',
      subtitle: '남은 블록의 합이 목표 숫자가 되도록',
      onStart: () => this.startGame(),
    });

    // 리사이즈 대응
    this.scale.on('resize', this.handleResize, this);
  }

  private calculateLayout(width: number, height: number): void {
    // 블록 가로를 3/4로 줄이고, 높이는 1.5배로
    this.blockWidth = Math.min(width * 0.525, 210); // 기존 0.7 * 0.75 = 0.525
    this.blockHeight = Math.min(height * 0.12, 90); // 기존 0.08 * 1.5 = 0.12
  }

  private setupGlobalSwipeDetection(): void {
    // pointermove에서 속도 기반 스와이프 감지
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.selectedBlock || !this.isPlaying) return;

      const dx = pointer.x - this.swipeStartX;
      const dy = pointer.y - this.swipeStartY;
      const elapsed = pointer.time - this.swipeStartTime;

      // 수평 이동이 수직보다 커야 함
      if (Math.abs(dx) <= Math.abs(dy)) return;

      // 최소 거리 체크
      if (Math.abs(dx) < this.SWIPE_MIN_DISTANCE) return;

      // 속도 계산 (px/ms)
      const speed = Math.abs(dx) / Math.max(elapsed, 1);

      // 속도가 임계값 이상이면 스와이프 성공 (좌우 모두 가능)
      if (speed >= this.SWIPE_SPEED_THRESHOLD) {
        const direction = dx > 0 ? 'right' : 'left';
        this.removeBlock(this.selectedBlock, direction);
        this.selectedBlock = null;
      }
    });

    // pointerup에서는 선택 해제만
    this.input.on('pointerup', () => {
      if (!this.selectedBlock) return;

      // 스와이프 취소 - 원래 색으로 복원
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

  private createHUD(width: number): void {
    // 공통 상단 바 생성
    this.topBar = new TopBar(this, {
      left: { type: 'time', initialValue: 60, color: COLORS.ACCENT_TEXT },
      right: { type: 'score', initialValue: 0 },
    });

    // 난이도 (우상단 아래, TopBar 바깥)
    this.difficultyText = this.add
      .text(width - TOP_BAR.PADDING_X, TOP_BAR.HEIGHT + 5, '난이도: 하', {
        fontSize: '14px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(1, 0)
      .setDepth(100);
  }

  private createTargetArea(width: number, height: number): void {
    const targetY = height * 0.15;

    // "목표" 라벨
    this.add
      .text(width / 2, targetY - 25, '목표', {
        fontSize: '18px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5);

    // 목표 숫자
    this.targetText = this.add
      .text(width / 2, targetY + 15, '0', {
        fontSize: '56px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.ACCENT_TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
  }

  private prepareRound(): void {
    // 기존 블록 제거
    this.blockSprites.forEach((bs) => bs.container.destroy());
    this.blockSprites = [];

    // 새 라운드 생성
    this.currentRound = generateRound(this.difficulty);

    // 목표 업데이트
    this.targetText.setText(String(this.currentRound.targetSum));

    // 블록 생성
    this.createBlocks();
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

    // 블록 색상 선택
    const blockColor = BLOCK_COLORS[colorIndex % BLOCK_COLORS.length];
    const radius = 16; // 모서리 둥글기

    // 둥근 모서리 블록 배경 (Graphics 사용)
    const bg = this.add.graphics();
    bg.fillStyle(blockColor, 1);
    bg.fillRoundedRect(
      -this.blockWidth / 2,
      -this.blockHeight / 2,
      this.blockWidth,
      this.blockHeight,
      radius
    );

    // 인터랙션용 히트 영역 (투명 사각형)
    const hitArea = this.add
      .rectangle(0, 0, this.blockWidth, this.blockHeight, 0x000000, 0)
      .setInteractive({ useHandCursor: true, draggable: false });

    // 숫자 (폰트 사이즈 증가)
    const text = this.add
      .text(0, 0, String(data.value), {
        fontSize: '44px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // 텍스트에 그림자 효과 추가
    text.setShadow(2, 2, 'rgba(0,0,0,0.3)', 4);

    container.add([bg, hitArea, text]);
    container.setSize(this.blockWidth, this.blockHeight);

    const blockSprite: BlockSprite = {
      data,
      container,
      isRemoving: false,
    };

    // pointerdown에서 블록 선택 및 스와이프 시작점 기록
    hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPlaying || blockSprite.isRemoving) return;
      this.selectedBlock = blockSprite;
      this.swipeStartX = pointer.x;
      this.swipeStartY = pointer.y;
      this.swipeStartTime = pointer.time;

      // 선택 효과 (밝게)
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

    // 선택 해제 시 원래 색상 복원을 위해 blockColor 저장
    (container as any).originalColor = blockColor;
    (container as any).bgGraphics = bg;

    return blockSprite;
  }

  private removeBlock(blockSprite: BlockSprite, direction: 'left' | 'right' = 'left'): void {
    if (blockSprite.isRemoving) return;
    blockSprite.isRemoving = true;

    const index = this.blockSprites.indexOf(blockSprite);
    if (index === -1) return;

    // 스와이프 방향에 따라 날아가는 방향 결정
    const targetX = direction === 'left' ? -this.blockWidth - 50 : this.blockWidth + 50;

    // 제거 애니메이션
    this.tweens.add({
      targets: blockSprite.container,
      x: targetX,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => {
        // 블록 제거 (배열에서만 제거, 다른 블록 위치 변경 없음)
        this.blockSprites.splice(index, 1);
        blockSprite.container.destroy();

        // 자동 정답 체크 (목표 달성 시 바로 성공 처리)
        this.checkAutoSuccess();
      },
    });
  }

  private checkAutoSuccess(): void {
    const remainingBlocks = this.blockSprites.filter((bs) => !bs.isRemoving).map((bs) => bs.data);
    const currentSum = calculateSum(remainingBlocks);

    // 목표 달성! 바로 성공 처리
    if (currentSum === this.currentRound.targetSum) {
      this.handleRoundSuccess(remainingBlocks.length);
      return;
    }

    // 달성 불가능하면 실패 처리
    if (!canAchieveTarget(remainingBlocks, this.currentRound.targetSum)) {
      this.handleRoundFail();
    }
  }

  private handleRoundSuccess(remainingBlockCount: number): void {
    this.clearedRounds++;
    this.consecutiveSuccess++;

    // 점수 계산: 남은 블록이 많을수록 높은 점수
    const baseScore = 100;
    const bonusMultiplier = remainingBlockCount; // 최소 1
    const difficultyBonus = this.difficulty === 'hard' ? 3 : this.difficulty === 'normal' ? 2 : 1;
    const roundScore = baseScore * bonusMultiplier * difficultyBonus;

    this.score += roundScore;
    this.topBar.updateValue('right', this.score);

    // 성공 효과
    this.showSuccessFeedback(roundScore);

    // 난이도 상승 체크
    if (this.consecutiveSuccess >= 3 && this.difficulty !== 'hard') {
      this.difficulty = getNextDifficulty(this.difficulty);
      this.consecutiveSuccess = 0;
      this.difficultyText.setText(`난이도: ${getDifficultyName(this.difficulty)}`);
      this.showDifficultyUpFeedback();
    }

    // 다음 라운드
    this.time.delayedCall(500, () => {
      if (this.isPlaying) {
        this.prepareRound();
      }
    });
  }

  private handleRoundFail(): void {
    this.consecutiveSuccess = 0;

    // 실패 효과
    this.showFailFeedback();

    // 다음 라운드
    this.time.delayedCall(800, () => {
      if (this.isPlaying) {
        this.prepareRound();
      }
    });
  }

  private showSuccessFeedback(points: number): void {
    const { width, height } = this.scale;

    const text = this.add
      .text(width / 2, height * 0.4, `+${points}`, {
        fontSize: '48px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#4ecca3',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: text,
      y: height * 0.35,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: text,
          alpha: 0,
          y: height * 0.3,
          duration: 200,
          delay: 200,
          onComplete: () => text.destroy(),
        });
      },
    });
  }

  private showFailFeedback(): void {
    const { width, height } = this.scale;

    const text = this.add
      .text(width / 2, height * 0.4, '❌ 불가능!', {
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

  private showDifficultyUpFeedback(): void {
    const { width, height } = this.scale;

    const text = this.add
      .text(width / 2, height * 0.3, `🔥 난이도 UP!`, {
        fontSize: '32px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.ACCENT_TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      scale: 1.2,
      duration: 300,
      yoyo: true,
      hold: 500,
      onComplete: () => text.destroy(),
    });
  }

  private startGame(): void {
    this.isPlaying = true;
    this.blockContainer.setAlpha(1);
    this.targetText.setAlpha(1);

    // 타이머 시작
    this.time.addEvent({
      delay: 100,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true,
    });
  }

  private updateTimer(): void {
    if (!this.isPlaying) return;

    this.timeLeft -= 100;

    const seconds = Math.max(0, this.timeLeft / 1000);
    this.topBar.updateValue('left', parseFloat(seconds.toFixed(1)));

    // 10초 이하일 때 빨간색
    if (this.timeLeft <= 10000) {
      this.topBar.setColor('left', '#e94560');
    }

    // 타임오버
    if (this.timeLeft <= 0) {
      this.endGame();
    }
  }

  private endGame(): void {
    this.isPlaying = false;

    this.scene.start('ResultScene', {
      score: this.score,
      clearedRounds: this.clearedRounds,
      maxDifficulty: getDifficultyName(this.difficulty),
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    this.calculateLayout(width, height);

    // 상단 바 리사이즈 대응
    this.topBar?.handleResize(width);

    // 난이도 텍스트 위치 조정
    this.difficultyText?.setPosition(width - TOP_BAR.PADDING_X, TOP_BAR.HEIGHT + 5);
  }
}
