import Phaser from 'phaser';
import { Question, generateQuestions, isSingleDigitAnswer } from '../utils/QuestionGenerator';
import { showStartScreen } from '../../../shared/ui';
import { TopBar, TOP_BAR } from '../../../shared/topBar';
import { BASE_COLORS } from '../../../shared/colors';
import { FONTS } from '../../../shared/constants';

// 색상 상수
const COLORS = {
  BG_PRIMARY: 0x1a1a2e,
  BG_SECONDARY: 0x16213e,
  ACCENT_RED: 0xe94560,
  ACCENT_GREEN: 0x4ecca3,
  ACCENT_YELLOW: 0xffc947,
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#a0a0a0',
  TEXT_DIM: '#606080',
  PAD_BG: 0x2a2a4e,
  PAD_HOVER: 0x3a3a5e,
};

export class GameScene extends Phaser.Scene {
  // 게임 상태
  private questions: Question[] = [];
  private currentQuestionIndex = 0;
  private currentInput = '';
  private startTime = 0;
  private elapsedTime = 0;
  private isPlaying = false;

  // UI 요소
  private topBar!: TopBar;

  // 문제 표시 (3개)
  private questionContainer!: Phaser.GameObjects.Container;
  private currentQuestionText!: Phaser.GameObjects.Text;
  private currentAnswerText!: Phaser.GameObjects.Text;
  private nextQuestionText!: Phaser.GameObjects.Text;
  private nextNextQuestionText!: Phaser.GameObjects.Text;

  // 숫자패드
  private padContainer!: Phaser.GameObjects.Container;

  // 레이아웃 설정
  private readonly TOTAL_QUESTIONS = 20;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // 문제 생성
    this.questions = generateQuestions(this.TOTAL_QUESTIONS);
    this.currentQuestionIndex = 0;
    this.currentInput = '';

    // 배경
    this.createBackground(width, height);

    // HUD (진행률, 타이머)
    this.createHUD();

    // 문제 영역 (3개 문제 표시)
    this.createQuestionArea(width, height);

    // 숫자패드
    this.createNumberPad(width, height);

    // 문제 표시 (아직 보이지 않음)
    this.updateQuestionDisplay();

    // 처음에는 게임 영역 숨김 (topBar는 보임)
    this.questionContainer.setAlpha(0);
    this.padContainer.setAlpha(0);

    // 시작 화면 표시
    showStartScreen(this, {
      title: '🔢 20문제를 빠르게 풀어보세요!',
      subtitle: '사칙연산 스피드 퀴즈',
      onStart: () => {
        this.showGameUI();
        this.startGame();
      },
    });

    // 리사이즈 대응
    this.scale.on('resize', this.handleResize, this);
  }

  private showGameUI(): void {
    // TopBar 표시
    this.topBar.setAlpha(1);

    // 게임 UI 페이드인
    this.tweens.add({
      targets: [this.questionContainer, this.padContainer],
      alpha: 1,
      duration: 200,
    });
  }

  private createBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(
      COLORS.BG_PRIMARY,
      COLORS.BG_PRIMARY,
      COLORS.BG_SECONDARY,
      COLORS.BG_SECONDARY
    );
    bg.fillRect(0, 0, width, height);
  }

  private createHUD(): void {
    // 공통 상단 바 생성
    this.topBar = new TopBar(this, {
      left: { type: 'progress', initialValue: '1/20' },
      right: { type: 'text', initialValue: '0.00초', color: BASE_COLORS.TEXT_SECONDARY },
    });

    // 대기 화면 동안 숨김 (폰트 로딩 전 깨짐 방지)
    this.topBar.setAlpha(0);
  }

  private createQuestionArea(width: number, height: number): void {
    // 문제 영역 컨테이너 (화면 상단 45% 영역 사용)
    const questionAreaHeight = height * 0.42;
    const questionAreaY = 50; // HUD 아래

    this.questionContainer = this.add.container(0, questionAreaY);

    // 현재 문제 (가장 크게, 강조 - Cherry Bomb One 폰트)
    const currentY = questionAreaHeight * 0.25;
    this.currentQuestionText = this.add
      .text(width / 2, currentY, '', {
        fontSize: '38px',
        fontFamily: FONTS.NUMBER,
        color: COLORS.TEXT_PRIMARY,
      })
      .setOrigin(1, 0.5);

    this.currentAnswerText = this.add
      .text(width / 2 + 8, currentY, '[__]', {
        fontSize: '38px',
        fontFamily: FONTS.NUMBER,
        color: '#ffc947',
      })
      .setOrigin(0, 0.5);

    // 구분선
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x4a4a6e, 0.5);
    divider.lineBetween(width * 0.15, currentY + 35, width * 0.85, currentY + 35);

    // 다음 문제 (중간 크기 - Cherry Bomb One 폰트)
    const nextY = questionAreaHeight * 0.55;
    this.nextQuestionText = this.add
      .text(width / 2, nextY, '', {
        fontSize: '30px',
        fontFamily: FONTS.NUMBER,
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5, 0.5);

    // 그다음 문제 (작고 흐리게 - Cherry Bomb One 폰트)
    const nextNextY = questionAreaHeight * 0.8;
    this.nextNextQuestionText = this.add
      .text(width / 2, nextNextY, '', {
        fontSize: '24px',
        fontFamily: FONTS.NUMBER,
        color: COLORS.TEXT_DIM,
      })
      .setOrigin(0.5, 0.5);

    this.questionContainer.add([
      this.currentQuestionText,
      this.currentAnswerText,
      divider,
      this.nextQuestionText,
      this.nextNextQuestionText,
    ]);
  }

  private createNumberPad(width: number, height: number): void {
    // 패드 영역 계산 (화면 하단 55% 사용)
    const padAreaTop = height * 0.45;
    const padAreaHeight = height - padAreaTop;

    // 버튼 크기 계산 (가로/세로 비율 고려)
    const maxButtonWidth = (width - 60) / 3; // 좌우 여백 30px씩, 3열
    const maxButtonHeight = (padAreaHeight - 80) / 4; // 상하 여백, 4행
    const buttonSize = Math.min(maxButtonWidth, maxButtonHeight, 85);
    const gap = Math.min(buttonSize * 0.12, 10);

    const totalPadWidth = buttonSize * 3 + gap * 2;
    const totalPadHeight = buttonSize * 4 + gap * 3;
    const startX = (width - totalPadWidth) / 2;
    const startY = padAreaTop + (padAreaHeight - totalPadHeight) / 2;

    this.padContainer = this.add.container(0, 0);

    // 숫자 배열 (1-9, 0, C)
    const layout = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'C'],
    ];

    layout.forEach((row, rowIndex) => {
      row.forEach((label, colIndex) => {
        if (label === '') return;

        const x = startX + colIndex * (buttonSize + gap) + buttonSize / 2;
        const y = startY + rowIndex * (buttonSize + gap) + buttonSize / 2;

        const button = this.createPadButton(x, y, buttonSize, label);
        this.padContainer.add(button);
      });
    });
  }

  private createPadButton(
    x: number,
    y: number,
    size: number,
    label: string
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // 버튼 배경
    const bg = this.add.rectangle(0, 0, size, size, COLORS.PAD_BG).setStrokeStyle(2, 0x4a4a6e);
    bg.setInteractive({ useHandCursor: true });

    // 버튼 텍스트 (숫자는 Cherry Bomb One, C는 기본 폰트)
    const fontSize = Math.max(size * 0.45, 26);
    const isNumber = !isNaN(Number(label)) || label === '-';
    const text = this.add
      .text(0, 0, label, {
        fontSize: `${fontSize}px`,
        fontFamily: isNumber ? FONTS.NUMBER : FONTS.DEFAULT,
        color: label === 'C' ? '#e94560' : COLORS.TEXT_PRIMARY,
      })
      .setOrigin(0.5);

    container.add([bg, text]);

    // 터치 이벤트
    bg.on('pointerover', () => {
      bg.setFillStyle(COLORS.PAD_HOVER);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(COLORS.PAD_BG);
    });

    bg.on('pointerdown', () => {
      // 터치 피드백
      this.tweens.add({
        targets: container,
        scaleX: 0.92,
        scaleY: 0.92,
        duration: 40,
        yoyo: true,
      });

      this.handlePadInput(label);
    });

    return container;
  }

  private handlePadInput(input: string): void {
    if (!this.isPlaying) return;

    if (input === 'C') {
      // 전체 지우기
      this.currentInput = '';
      this.updateAnswerDisplay();
      return;
    }

    // 숫자 입력 (최대 2자리)
    if (this.currentInput.length < 2) {
      this.currentInput += input;
      this.updateAnswerDisplay();
      this.checkAnswer();
    }
  }

  private updateAnswerDisplay(): void {
    if (this.currentInput === '') {
      this.currentAnswerText.setText('[__]');
    } else if (this.currentInput.length === 1) {
      this.currentAnswerText.setText(`[${this.currentInput}_]`);
    } else {
      this.currentAnswerText.setText(`[${this.currentInput}]`);
    }
  }

  private updateQuestionDisplay(): void {
    // 현재 문제
    const current = this.questions[this.currentQuestionIndex];
    this.currentQuestionText.setText(current.displayText);

    // 다음 문제
    if (this.currentQuestionIndex + 1 < this.TOTAL_QUESTIONS) {
      const next = this.questions[this.currentQuestionIndex + 1];
      this.nextQuestionText.setText(next.displayText);
      this.nextQuestionText.setAlpha(1);
    } else {
      this.nextQuestionText.setText('');
    }

    // 그다음 문제
    if (this.currentQuestionIndex + 2 < this.TOTAL_QUESTIONS) {
      const nextNext = this.questions[this.currentQuestionIndex + 2];
      this.nextNextQuestionText.setText(nextNext.displayText);
      this.nextNextQuestionText.setAlpha(1);
    } else {
      this.nextNextQuestionText.setText('');
    }

    // 진행률 업데이트
    this.topBar.updateValue('left', `${this.currentQuestionIndex + 1}/${this.TOTAL_QUESTIONS}`);
  }

  private checkAnswer(): void {
    const currentQuestion = this.questions[this.currentQuestionIndex];
    const correctAnswer = currentQuestion.answer;
    const userAnswer = parseInt(this.currentInput, 10);
    const isSingleDigit = isSingleDigitAnswer(correctAnswer);

    // 한자리 정답: 한자리 입력 시 즉시 체크
    if (isSingleDigit && this.currentInput.length === 1) {
      if (userAnswer === correctAnswer) {
        this.handleCorrectAnswer();
      }
      // 한자리 정답인데 다른 한자리 입력 → 아직 오답 아님 (두자리까지 대기)
      return;
    }

    // 두자리 입력 완료 시 체크
    if (this.currentInput.length === 2) {
      if (userAnswer === correctAnswer) {
        this.handleCorrectAnswer();
      } else {
        this.handleWrongAnswer();
      }
    }
  }

  private handleCorrectAnswer(): void {
    // 정답 효과 (초록색 플래시)
    const originalX = this.currentAnswerText.x;

    this.tweens.add({
      targets: this.currentAnswerText,
      alpha: 0.5,
      duration: 80,
      yoyo: true,
      onStart: () => {
        this.currentAnswerText.setColor('#4ecca3');
      },
      onComplete: () => {
        this.currentAnswerText.setColor('#ffc947');
        this.currentAnswerText.x = originalX;
        this.nextQuestion();
      },
    });
  }

  private handleWrongAnswer(): void {
    const originalX = this.currentAnswerText.x;

    // 오답 효과 (빨간색 + 흔들림)
    this.tweens.add({
      targets: this.currentAnswerText,
      x: originalX + 8,
      duration: 40,
      yoyo: true,
      repeat: 2,
      onStart: () => {
        this.currentAnswerText.setColor('#e94560');
      },
      onComplete: () => {
        this.currentAnswerText.setColor('#ffc947');
        this.currentAnswerText.x = originalX;
        this.currentInput = '';
        this.updateAnswerDisplay();
      },
    });
  }

  private nextQuestion(): void {
    this.currentQuestionIndex++;

    if (this.currentQuestionIndex >= this.TOTAL_QUESTIONS) {
      this.endGame();
      return;
    }

    // 다음 문제 준비
    this.currentInput = '';
    this.updateAnswerDisplay();

    // 문제 스크롤 애니메이션
    this.animateQuestionScroll();
  }

  private animateQuestionScroll(): void {
    // 현재 문제들의 Y 위치 저장
    const currentY = this.currentQuestionText.y;
    const nextY = this.nextQuestionText.y;
    const nextNextY = this.nextNextQuestionText.y;

    // 현재 문제 위로 사라짐
    this.tweens.add({
      targets: [this.currentQuestionText, this.currentAnswerText],
      y: currentY - 30,
      alpha: 0,
      duration: 120,
      onComplete: () => {
        this.currentQuestionText.y = currentY;
        this.currentQuestionText.alpha = 1;
        this.currentAnswerText.y = currentY;
        this.currentAnswerText.alpha = 1;
        this.updateQuestionDisplay();
      },
    });

    // 다음 문제 → 현재 위치로 (살짝 강조)
    this.tweens.add({
      targets: this.nextQuestionText,
      y: currentY,
      alpha: 0,
      duration: 120,
      onComplete: () => {
        this.nextQuestionText.y = nextY;
        this.nextQuestionText.alpha = 1;
      },
    });

    // 그다음 문제 → 다음 위치로
    this.tweens.add({
      targets: this.nextNextQuestionText,
      y: nextY,
      alpha: 0,
      duration: 120,
      onComplete: () => {
        this.nextNextQuestionText.y = nextNextY;
        this.nextNextQuestionText.alpha = 1;
      },
    });
  }

  private startGame(): void {
    this.isPlaying = true;
    this.startTime = Date.now();
    this.elapsedTime = 0;
  }

  private endGame(): void {
    this.isPlaying = false;
    this.elapsedTime = Date.now() - this.startTime;

    this.scene.start('ResultScene', {
      totalTime: this.elapsedTime,
    });
  }

  update(): void {
    if (this.isPlaying) {
      const elapsed = Date.now() - this.startTime;
      const seconds = (elapsed / 1000).toFixed(2);
      this.topBar.updateValue('right', `${seconds}초`);
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width } = gameSize;

    // 상단 바 리사이즈 대응
    this.topBar?.handleResize(width);
  }
}
