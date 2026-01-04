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
import { TopBar } from '../../../shared/topBar';
import { FONTS } from '../../../shared/constants';

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

// ========================================
// 🎮 라운드 제한시간 설정 (초 단위)
// 형님이 테스트 후 조정하기 쉽게 분리
// ========================================
const ROUND_TIME_CONFIG = {
  // 초반 (1~4 라운드): 여유롭게
  EARLY: 10,
  // 중반 (5~9 라운드): 보통
  MID: 8,
  // 후반 (10+ 라운드): 빠르게
  LATE: 6,
  // 라운드 구간 기준
  EARLY_THRESHOLD: 5,
  MID_THRESHOLD: 10,
} as const;

// 라운드에 따른 제한시간 반환
function getRoundTimeLimit(round: number): number {
  if (round < ROUND_TIME_CONFIG.EARLY_THRESHOLD) {
    return ROUND_TIME_CONFIG.EARLY;
  } else if (round < ROUND_TIME_CONFIG.MID_THRESHOLD) {
    return ROUND_TIME_CONFIG.MID;
  } else {
    return ROUND_TIME_CONFIG.LATE;
  }
}

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
  private isPlaying = false;

  // 라운드 타이머
  private roundTimeLimit = 0; // 현재 라운드 제한시간 (초)
  private roundTimeLeft = 0; // 남은 시간 (ms)
  private roundTimerEvent?: Phaser.Time.TimerEvent;

  // 현재 라운드
  private currentRound!: RoundData;
  private blockSprites: BlockSprite[] = [];

  // UI 요소
  private topBar!: TopBar;
  private targetLabel!: Phaser.GameObjects.Text;
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
    this.isPlaying = false;
    this.blockSprites = [];
    this.roundTimeLimit = 0;
    this.roundTimeLeft = 0;

    // 레이아웃 계산
    this.calculateLayout(width, height);

    // 배경
    createGradientBackground(this, width, height);

    // HUD
    this.createHUD();

    // 목표 영역
    this.createTargetArea(width, height);

    // 블록 컨테이너 (확인 버튼 제거로 세로 중앙 배치)
    this.blockContainer = this.add.container(width / 2, height * 0.5);

    // 카운트다운 동안 숨김 (폰트 로딩 후 startGame에서 생성)
    this.blockContainer.setAlpha(0);
    this.targetLabel.setAlpha(0);
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

  private createHUD(): void {
    // 공통 상단 바 생성: 하트 | 라운드 시간 | 점수
    this.topBar = new TopBar(this, {
      left: { type: 'lives', maxLives: 3 },
      center: { type: 'time', initialValue: 10, color: COLORS.ACCENT_TEXT },
      right: { type: 'score', initialValue: 0 },
    });
  }

  private createTargetArea(width: number, height: number): void {
    const targetY = height * 0.15;

    // "목표" 라벨
    this.targetLabel = this.add
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
        fontFamily: FONTS.NUMBER,
        color: COLORS.ACCENT_TEXT,
      })
      .setOrigin(0.5);
  }

  private prepareRound(): void {
    // 기존 타이머 정리
    this.roundTimerEvent?.destroy();

    // 기존 블록 제거
    this.blockSprites.forEach((bs) => bs.container.destroy());
    this.blockSprites = [];

    // 새 라운드 생성
    this.currentRound = generateRound(this.difficulty);

    // 목표 업데이트
    this.targetText.setText(String(this.currentRound.targetSum));

    // 블록 생성
    this.createBlocks();

    // 라운드 타이머 설정
    this.roundTimeLimit = getRoundTimeLimit(this.clearedRounds + 1);
    this.roundTimeLeft = this.roundTimeLimit * 1000;
    this.topBar.updateValue('center', this.roundTimeLimit);
    this.topBar.setColor('center', COLORS.ACCENT_TEXT); // 색상 리셋

    // 라운드 타이머 시작
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

    // 숫자 (Cherry Bomb One 폰트)
    const text = this.add
      .text(0, 0, String(data.value), {
        fontSize: '44px',
        fontFamily: FONTS.NUMBER,
        color: '#ffffff',
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
    // 타이머 정지
    this.roundTimerEvent?.destroy();

    this.clearedRounds++;
    this.consecutiveSuccess++;

    // 점수 계산: 남은 블록이 많을수록 높은 점수
    const baseScore = 100;
    const bonusMultiplier = remainingBlockCount; // 최소 1
    const difficultyBonus = this.difficulty === 'hard' ? 3 : this.difficulty === 'normal' ? 2 : 1;
    const roundScore = baseScore * bonusMultiplier * difficultyBonus;

    this.score += roundScore;
    this.topBar.updateValue('right', this.score);

    // 난이도 상승 체크
    if (this.consecutiveSuccess >= 3 && this.difficulty !== 'hard') {
      this.difficulty = getNextDifficulty(this.difficulty);
      this.consecutiveSuccess = 0;
    }

    // 성공 효과 후 다음 라운드
    this.showSuccessFeedback(() => {
      if (this.isPlaying) {
        this.prepareRound();
      }
    });
  }

  private handleRoundFail(): void {
    // 타이머 정지
    this.roundTimerEvent?.destroy();

    this.consecutiveSuccess = 0;

    // 하트 감소
    const isGameOver = this.topBar.loseLife('left');

    // 실패 효과
    this.showFailFeedback();

    // 게임 오버 체크
    if (isGameOver) {
      this.time.delayedCall(500, () => {
        this.endGame();
      });
      return;
    }

    // 다음 라운드 (실패 효과 후 빠르게 전환)
    this.time.delayedCall(500, () => {
      if (this.isPlaying) {
        this.prepareRound();
      }
    });
  }

  private showSuccessFeedback(onComplete?: () => void): void {
    // 목표 숫자에 겹쳐서 O 마크 표시 (채점 느낌)
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
      .setDepth(200) // 숫자 위에 겹치도록
      .setAlpha(1);

    // O 깜빡깜빡 2번 (duration 150ms로 약간 느리게)
    this.tweens.add({
      targets: mark,
      alpha: 0,
      duration: 150,
      yoyo: true,
      repeat: 1, // 1→0→1→0 = 깜빡 2번
      onComplete: () => {
        mark.destroy();
        // 점멸 끝나고 다음 라운드로
        onComplete?.();
      },
    });

    // 따봉 효과: 왼쪽에서 슬라이드 인 + 페이드 인
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

    // 목표 숫자에 겹쳐서 X 마크 표시 (채점 느낌)
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
      .setDepth(200) // 숫자 위에 겹치도록
      .setAlpha(1);

    // X 표시 후 페이드 아웃
    this.tweens.add({
      targets: mark,
      alpha: 0,
      duration: 200,
      delay: 500,
      onComplete: () => mark.destroy(),
    });

    // 화면 흔들림
    this.cameras.main.shake(200, 0.01);

    // 빨간색 플래시 오버레이
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
    this.blockContainer.setAlpha(1);
    this.targetLabel.setAlpha(1);
    this.targetText.setAlpha(1);

    // 첫 라운드 준비 (폰트 로딩 완료 후 블록 생성)
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

    // 3초 이하일 때 빨간색
    if (this.roundTimeLeft <= 3000) {
      this.topBar.setColor('center', '#e94560');
    }

    // 시간 초과 = 실패
    if (this.roundTimeLeft <= 0) {
      this.roundTimerEvent?.destroy();
      this.handleRoundFail();
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
  }
}
