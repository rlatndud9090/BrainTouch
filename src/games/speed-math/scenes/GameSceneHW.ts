import Phaser from 'phaser';
import { Question, generateQuestions, isSingleDigitAnswer } from '../utils/QuestionGenerator';
import { digitRecognizer } from '../utils/DigitRecognizer';

// 색상 상수
const COLORS = {
  BG_PRIMARY: 0x1a1a2e,
  BG_SECONDARY: 0x16213e,
  CANVAS_BG: 0x2a2a4e,
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#a0a0a0',
  TEXT_DIM: '#606080',
};

export class GameSceneHW extends Phaser.Scene {
  // 게임 상태
  private questions: Question[] = [];
  private currentQuestionIndex = 0;
  private currentInput = '';
  private startTime = 0;
  private elapsedTime = 0;
  private isPlaying = false;

  // UI 요소
  private timerText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;

  // 문제 표시
  private questionContainer!: Phaser.GameObjects.Container;
  private currentQuestionText!: Phaser.GameObjects.Text;
  private currentAnswerText!: Phaser.GameObjects.Text;
  private nextQuestionText!: Phaser.GameObjects.Text;
  private nextNextQuestionText!: Phaser.GameObjects.Text;

  // 필기 캔버스 (단일)
  private canvasContainer!: Phaser.GameObjects.Container;
  private drawCanvas!: HTMLCanvasElement;
  private drawCtx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private recognitionTimer: number | null = null;

  // 카운트다운
  private countdownText!: Phaser.GameObjects.Text;

  // 레이아웃 설정
  private readonly TOTAL_QUESTIONS = 20;
  private canvasWidth = 200;
  private canvasHeight = 120;

  constructor() {
    super({ key: 'GameSceneHW' });
  }

  create(): void {
    const { width, height } = this.scale;

    // 문제 생성
    this.questions = generateQuestions(this.TOTAL_QUESTIONS);
    this.currentQuestionIndex = 0;
    this.currentInput = '';

    // 배경
    this.createBackground(width, height);

    // HUD
    this.createHUD(width);

    // 문제 영역
    this.createQuestionArea(width, height);

    // 필기 캔버스 (단일)
    this.createHandwritingCanvas(width, height);

    // 문제 표시
    this.updateQuestionDisplay();

    // 처음에는 게임 영역 숨김
    this.questionContainer.setAlpha(0);
    this.canvasContainer.setAlpha(0);
    this.progressText.setAlpha(0);
    this.timerText.setAlpha(0);

    // 캔버스 숨김
    this.hideHTMLCanvas();

    // 카운트다운 시작
    this.startCountdown();

    // 리사이즈 대응
    this.scale.on('resize', this.handleResize, this);

    // 씬 종료 시 정리
    this.events.on('shutdown', this.cleanup, this);
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

  private createHUD(width: number): void {
    this.progressText = this.add
      .text(16, 16, '1/20', {
        fontSize: '20px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_PRIMARY,
      })
      .setOrigin(0, 0);

    this.timerText = this.add
      .text(width - 16, 16, '0.00초', {
        fontSize: '16px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(1, 0);
  }

  private createQuestionArea(width: number, height: number): void {
    const questionAreaHeight = height * 0.35;
    const questionAreaY = 50;

    this.questionContainer = this.add.container(0, questionAreaY);

    // 현재 문제
    const currentY = questionAreaHeight * 0.3;
    this.currentQuestionText = this.add
      .text(width / 2, currentY, '', {
        fontSize: '32px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_PRIMARY,
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5);

    this.currentAnswerText = this.add
      .text(width / 2 + 8, currentY, '[__]', {
        fontSize: '32px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#ffc947',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    // 구분선
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x4a4a6e, 0.5);
    divider.lineBetween(width * 0.15, currentY + 30, width * 0.85, currentY + 30);

    // 다음 문제
    const nextY = questionAreaHeight * 0.6;
    this.nextQuestionText = this.add
      .text(width / 2, nextY, '', {
        fontSize: '24px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5, 0.5);

    // 그다음 문제
    const nextNextY = questionAreaHeight * 0.85;
    this.nextNextQuestionText = this.add
      .text(width / 2, nextNextY, '', {
        fontSize: '18px',
        fontFamily: 'Pretendard, sans-serif',
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

  private createHandwritingCanvas(width: number, height: number): void {
    const canvasAreaTop = height * 0.4;
    const canvasAreaHeight = height - canvasAreaTop;

    // 캔버스 크기 계산 (가로로 넓게)
    this.canvasWidth = Math.min(width * 0.85, 280);
    this.canvasHeight = Math.min(canvasAreaHeight * 0.45, 140);
    const centerX = width / 2;
    const centerY = canvasAreaTop + canvasAreaHeight * 0.35;

    this.canvasContainer = this.add.container(0, 0);

    // 라벨
    const label = this.add
      .text(centerX, centerY - this.canvasHeight / 2 - 20, '숫자를 써주세요', {
        fontSize: '14px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5);

    // 캔버스 배경 (Phaser)
    const canvasBg = this.add
      .rectangle(centerX, centerY, this.canvasWidth, this.canvasHeight, COLORS.CANVAS_BG)
      .setStrokeStyle(2, 0x4a4a6e);

    // 중앙 점선 가이드 (두 자리 숫자 안내)
    const guideLine = this.add.graphics();
    guideLine.lineStyle(1, 0x4a4a6e, 0.5);
    guideLine.setLineDash([5, 5]);
    guideLine.lineBetween(
      centerX,
      centerY - this.canvasHeight / 2 + 10,
      centerX,
      centerY + this.canvasHeight / 2 - 10
    );

    // 지우기 버튼
    const clearBtnY = centerY + this.canvasHeight / 2 + 35;
    const clearBtn = this.createClearButton(width / 2, clearBtnY);

    this.canvasContainer.add([label, canvasBg, guideLine, clearBtn]);

    // HTML Canvas 생성
    this.createHTMLCanvas(centerX, centerY);
  }

  private createHTMLCanvas(centerX: number, centerY: number): void {
    const gameCanvas = this.game.canvas;
    const rect = gameCanvas.getBoundingClientRect();

    this.drawCanvas = document.createElement('canvas');
    this.drawCanvas.width = this.canvasWidth;
    this.drawCanvas.height = this.canvasHeight;
    this.drawCanvas.style.position = 'absolute';
    this.drawCanvas.style.left = `${rect.left + centerX - this.canvasWidth / 2}px`;
    this.drawCanvas.style.top = `${rect.top + centerY - this.canvasHeight / 2}px`;
    this.drawCanvas.style.backgroundColor = 'transparent';
    this.drawCanvas.style.touchAction = 'none';
    this.drawCanvas.style.cursor = 'crosshair';
    this.drawCanvas.style.display = 'none';
    document.body.appendChild(this.drawCanvas);
    this.drawCtx = this.drawCanvas.getContext('2d')!;

    this.clearCanvas();
    this.setupCanvasEvents();
  }

  private setupCanvasEvents(): void {
    const canvas = this.drawCanvas;
    const ctx = this.drawCtx;

    const getPos = (e: MouseEvent | Touch) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const startDraw = (e: MouseEvent | TouchEvent) => {
      if (!this.isPlaying) return;
      e.preventDefault();
      this.isDrawing = true;

      const pos = getPos(e instanceof MouseEvent ? e : e.touches[0]);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);

      // 인식 타이머 취소
      if (this.recognitionTimer) {
        clearTimeout(this.recognitionTimer);
        this.recognitionTimer = null;
      }
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!this.isDrawing) return;
      e.preventDefault();

      const pos = getPos(e instanceof MouseEvent ? e : e.touches[0]);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(this.canvasHeight / 12, 8);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    };

    const endDraw = () => {
      if (!this.isDrawing) return;
      this.isDrawing = false;

      // 500ms 후 인식 시작
      this.recognitionTimer = window.setTimeout(() => {
        this.recognizeDigits();
      }, 500);
    };

    // 마우스 이벤트
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mouseleave', endDraw);

    // 터치 이벤트
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', endDraw);
  }

  private async recognizeDigits(): Promise<void> {
    // 캔버스가 비어있는지 확인
    const imageData = this.drawCtx.getImageData(
      0,
      0,
      this.drawCanvas.width,
      this.drawCanvas.height
    );
    const isEmpty = !imageData.data.some((v, i) => i % 4 === 3 && v > 0);

    if (isEmpty) {
      this.currentInput = '';
      this.updateAnswerDisplay();
      return;
    }

    // 인식 (자동 분할)
    const result = await digitRecognizer.predictFromCanvas(this.drawCanvas);

    if (result) {
      this.currentInput = result;
      this.updateAnswerDisplay();
      this.checkAnswer();
    }
  }

  private clearCanvas(): void {
    this.drawCtx?.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.currentInput = '';
    this.updateAnswerDisplay();
  }

  private createClearButton(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const width = 120;
    const height = 44;

    const bg = this.add.rectangle(0, 0, width, height, 0xe94560).setStrokeStyle(2, 0xffffff, 0.3);
    bg.setInteractive({ useHandCursor: true });

    const text = this.add
      .text(0, 0, 'C 지우기', {
        fontSize: '18px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    container.add([bg, text]);

    bg.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
      });
      this.clearCanvas();
    });

    return container;
  }

  private showHTMLCanvas(): void {
    if (this.drawCanvas) this.drawCanvas.style.display = 'block';
  }

  private hideHTMLCanvas(): void {
    if (this.drawCanvas) this.drawCanvas.style.display = 'none';
  }

  private startCountdown(): void {
    const { width, height } = this.scale;

    this.countdownText = this.add
      .text(width / 2, height / 2, '3', {
        fontSize: '120px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_PRIMARY,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const counts = ['3', '2', '1', '시작!'];
    let index = 0;

    const showNext = () => {
      if (index >= counts.length) {
        this.countdownText.destroy();
        this.showGameUI();
        this.startGame();
        return;
      }

      this.countdownText.setText(counts[index]);
      this.countdownText.setFontSize(index === 3 ? '72px' : '120px');
      this.countdownText.setAlpha(1);
      this.countdownText.setScale(1.5);

      this.tweens.add({
        targets: this.countdownText,
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

  private showGameUI(): void {
    this.tweens.add({
      targets: [this.questionContainer, this.canvasContainer, this.progressText, this.timerText],
      alpha: 1,
      duration: 200,
    });
    this.showHTMLCanvas();
  }

  private updateAnswerDisplay(): void {
    if (this.currentInput === '') {
      this.currentAnswerText.setText('[__]');
    } else if (this.currentInput.length === 1) {
      this.currentAnswerText.setText(`[_${this.currentInput}]`);
    } else {
      this.currentAnswerText.setText(`[${this.currentInput}]`);
    }
  }

  private updateQuestionDisplay(): void {
    const current = this.questions[this.currentQuestionIndex];
    this.currentQuestionText.setText(current.displayText);

    if (this.currentQuestionIndex + 1 < this.TOTAL_QUESTIONS) {
      const next = this.questions[this.currentQuestionIndex + 1];
      this.nextQuestionText.setText(next.displayText);
    } else {
      this.nextQuestionText.setText('');
    }

    if (this.currentQuestionIndex + 2 < this.TOTAL_QUESTIONS) {
      const nextNext = this.questions[this.currentQuestionIndex + 2];
      this.nextNextQuestionText.setText(nextNext.displayText);
    } else {
      this.nextNextQuestionText.setText('');
    }

    this.progressText.setText(`${this.currentQuestionIndex + 1}/${this.TOTAL_QUESTIONS}`);
  }

  private checkAnswer(): void {
    const currentQuestion = this.questions[this.currentQuestionIndex];
    const correctAnswer = currentQuestion.answer;
    const userAnswer = parseInt(this.currentInput, 10);
    const isSingleDigit = isSingleDigitAnswer(correctAnswer);

    // 한자리 정답
    if (isSingleDigit && this.currentInput.length === 1) {
      if (userAnswer === correctAnswer) {
        this.handleCorrectAnswer();
      }
      return;
    }

    // 두자리 입력
    if (this.currentInput.length === 2) {
      if (userAnswer === correctAnswer) {
        this.handleCorrectAnswer();
      } else {
        this.handleWrongAnswer();
      }
    }
  }

  private handleCorrectAnswer(): void {
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
        this.clearCanvas();
      },
    });
  }

  private nextQuestion(): void {
    this.currentQuestionIndex++;

    if (this.currentQuestionIndex >= this.TOTAL_QUESTIONS) {
      this.endGame();
      return;
    }

    this.clearCanvas();
    this.animateQuestionScroll();
  }

  private animateQuestionScroll(): void {
    const currentY = this.currentQuestionText.y;
    const nextY = this.nextQuestionText.y;
    const nextNextY = this.nextNextQuestionText.y;

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
    this.hideHTMLCanvas();

    this.scene.start('ResultScene', {
      totalTime: this.elapsedTime,
    });
  }

  update(): void {
    if (this.isPlaying) {
      const elapsed = Date.now() - this.startTime;
      const seconds = (elapsed / 1000).toFixed(2);
      this.timerText.setText(`${seconds}초`);
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width } = gameSize;
    this.timerText?.setPosition(width - 16, 16);
    this.updateCanvasPosition();
  }

  private updateCanvasPosition(): void {
    if (!this.drawCanvas) return;

    const { width, height } = this.scale;
    const gameCanvas = this.game.canvas;
    const rect = gameCanvas.getBoundingClientRect();

    const canvasAreaTop = height * 0.4;
    const canvasAreaHeight = height - canvasAreaTop;
    const centerX = width / 2;
    const centerY = canvasAreaTop + canvasAreaHeight * 0.35;

    this.drawCanvas.style.left = `${rect.left + centerX - this.canvasWidth / 2}px`;
    this.drawCanvas.style.top = `${rect.top + centerY - this.canvasHeight / 2}px`;
  }

  private cleanup(): void {
    if (this.drawCanvas) {
      this.drawCanvas.remove();
    }
    if (this.recognitionTimer) {
      clearTimeout(this.recognitionTimer);
    }
  }
}
