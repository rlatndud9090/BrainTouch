import Phaser from 'phaser';
import { Question, generateQuestions, isSingleDigitAnswer } from '../utils/QuestionGenerator';
import { digitRecognizer, DigitRecognizer } from '../utils/DigitRecognizer';

// 색상 상수
const COLORS = {
  BG_PRIMARY: 0x1a1a2e,
  BG_SECONDARY: 0x16213e,
  CANVAS_BG: 0x2a2a4e,
  CANVAS_STROKE: 0xffffff,
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

  // 필기 캔버스
  private canvasContainer!: Phaser.GameObjects.Container;
  private leftCanvas!: HTMLCanvasElement;
  private rightCanvas!: HTMLCanvasElement;
  private leftCtx!: CanvasRenderingContext2D;
  private rightCtx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private currentCanvas: 'left' | 'right' | null = null;
  private recognitionTimer: number | null = null;

  // 입력 상태
  private leftDigit = '';
  private rightDigit = '';

  // 카운트다운
  private countdownText!: Phaser.GameObjects.Text;

  // 레이아웃 설정
  private readonly TOTAL_QUESTIONS = 20;
  private canvasSize = 100;

  constructor() {
    super({ key: 'GameSceneHW' });
  }

  create(): void {
    const { width, height } = this.scale;

    // 문제 생성
    this.questions = generateQuestions(this.TOTAL_QUESTIONS);
    this.currentQuestionIndex = 0;
    this.currentInput = '';
    this.leftDigit = '';
    this.rightDigit = '';

    // 배경
    this.createBackground(width, height);

    // HUD
    this.createHUD(width);

    // 문제 영역
    this.createQuestionArea(width, height);

    // 필기 캔버스
    this.createHandwritingCanvas(width, height);

    // 문제 표시
    this.updateQuestionDisplay();

    // 처음에는 게임 영역 숨김
    this.questionContainer.setAlpha(0);
    this.canvasContainer.setAlpha(0);
    this.progressText.setAlpha(0);
    this.timerText.setAlpha(0);

    // 캔버스 숨김
    this.hideHTMLCanvases();

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

    // 캔버스 크기 계산
    this.canvasSize = Math.min((width - 80) / 2, canvasAreaHeight * 0.5, 120);
    const gap = 20;
    const totalWidth = this.canvasSize * 2 + gap;
    const startX = (width - totalWidth) / 2;
    const centerY = canvasAreaTop + canvasAreaHeight * 0.35;

    this.canvasContainer = this.add.container(0, 0);

    // 라벨
    const labelY = centerY - this.canvasSize / 2 - 25;
    const leftLabel = this.add
      .text(startX + this.canvasSize / 2, labelY, '십의 자리', {
        fontSize: '14px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5);

    const rightLabel = this.add
      .text(startX + this.canvasSize + gap + this.canvasSize / 2, labelY, '일의 자리', {
        fontSize: '14px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5);

    // Phaser 캔버스 배경 (시각적 표시용)
    const leftBg = this.add
      .rectangle(
        startX + this.canvasSize / 2,
        centerY,
        this.canvasSize,
        this.canvasSize,
        COLORS.CANVAS_BG
      )
      .setStrokeStyle(2, 0x4a4a6e);

    const rightBg = this.add
      .rectangle(
        startX + this.canvasSize + gap + this.canvasSize / 2,
        centerY,
        this.canvasSize,
        this.canvasSize,
        COLORS.CANVAS_BG
      )
      .setStrokeStyle(2, 0x4a4a6e);

    // 지우기 버튼
    const clearBtnY = centerY + this.canvasSize / 2 + 40;
    const clearBtn = this.createClearButton(width / 2, clearBtnY);

    this.canvasContainer.add([leftLabel, rightLabel, leftBg, rightBg, clearBtn]);

    // HTML Canvas 생성 (실제 필기용)
    this.createHTMLCanvases(startX, centerY);
  }

  private createHTMLCanvases(startX: number, centerY: number): void {
    const gameCanvas = this.game.canvas;
    const rect = gameCanvas.getBoundingClientRect();
    const gap = 20;

    // 왼쪽 캔버스 (십의 자리)
    this.leftCanvas = document.createElement('canvas');
    this.leftCanvas.width = this.canvasSize;
    this.leftCanvas.height = this.canvasSize;
    this.leftCanvas.style.position = 'absolute';
    this.leftCanvas.style.left = `${rect.left + startX}px`;
    this.leftCanvas.style.top = `${rect.top + centerY - this.canvasSize / 2}px`;
    this.leftCanvas.style.backgroundColor = 'transparent';
    this.leftCanvas.style.touchAction = 'none';
    this.leftCanvas.style.cursor = 'crosshair';
    this.leftCanvas.style.display = 'none';
    document.body.appendChild(this.leftCanvas);
    this.leftCtx = this.leftCanvas.getContext('2d')!;

    // 오른쪽 캔버스 (일의 자리)
    this.rightCanvas = document.createElement('canvas');
    this.rightCanvas.width = this.canvasSize;
    this.rightCanvas.height = this.canvasSize;
    this.rightCanvas.style.position = 'absolute';
    this.rightCanvas.style.left = `${rect.left + startX + this.canvasSize + gap}px`;
    this.rightCanvas.style.top = `${rect.top + centerY - this.canvasSize / 2}px`;
    this.rightCanvas.style.backgroundColor = 'transparent';
    this.rightCanvas.style.touchAction = 'none';
    this.rightCanvas.style.cursor = 'crosshair';
    this.rightCanvas.style.display = 'none';
    document.body.appendChild(this.rightCanvas);
    this.rightCtx = this.rightCanvas.getContext('2d')!;

    // 캔버스 초기화
    this.clearCanvas('left');
    this.clearCanvas('right');

    // 이벤트 리스너 추가
    this.setupCanvasEvents(this.leftCanvas, 'left');
    this.setupCanvasEvents(this.rightCanvas, 'right');
  }

  private setupCanvasEvents(canvas: HTMLCanvasElement, side: 'left' | 'right'): void {
    const ctx = side === 'left' ? this.leftCtx : this.rightCtx;

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
      this.currentCanvas = side;

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
      if (!this.isDrawing || this.currentCanvas !== side) return;
      e.preventDefault();

      const pos = getPos(e instanceof MouseEvent ? e : e.touches[0]);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(this.canvasSize / 15, 6);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    };

    const endDraw = () => {
      if (!this.isDrawing) return;
      this.isDrawing = false;

      // 300ms 후 인식 시작
      this.recognitionTimer = window.setTimeout(() => {
        this.recognizeDigit(side);
      }, 300);
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

  private async recognizeDigit(side: 'left' | 'right'): Promise<void> {
    const canvas = side === 'left' ? this.leftCanvas : this.rightCanvas;

    // 캔버스가 비어있는지 확인
    const ctx = side === 'left' ? this.leftCtx : this.rightCtx;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const isEmpty = !imageData.data.some((v, i) => i % 4 === 3 && v > 0); // alpha 체크

    if (isEmpty) {
      if (side === 'left') this.leftDigit = '';
      else this.rightDigit = '';
      this.updateCurrentInput();
      return;
    }

    // 인식
    const processedData = DigitRecognizer.extractImageData(canvas);
    const digit = await digitRecognizer.predict(processedData);

    if (digit >= 0) {
      if (side === 'left') {
        this.leftDigit = digit.toString();
      } else {
        this.rightDigit = digit.toString();
      }
      this.updateCurrentInput();
      this.checkAnswer();
    }
  }

  private updateCurrentInput(): void {
    // 두 자리 숫자 조합
    if (this.leftDigit && this.rightDigit) {
      this.currentInput = this.leftDigit + this.rightDigit;
    } else if (this.rightDigit) {
      this.currentInput = this.rightDigit;
    } else {
      this.currentInput = '';
    }

    this.updateAnswerDisplay();
  }

  private clearCanvas(side: 'left' | 'right' | 'both'): void {
    if (side === 'left' || side === 'both') {
      this.leftCtx?.clearRect(0, 0, this.canvasSize, this.canvasSize);
      this.leftDigit = '';
    }
    if (side === 'right' || side === 'both') {
      this.rightCtx?.clearRect(0, 0, this.canvasSize, this.canvasSize);
      this.rightDigit = '';
    }
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
      this.clearCanvas('both');
    });

    return container;
  }

  private showHTMLCanvases(): void {
    if (this.leftCanvas) this.leftCanvas.style.display = 'block';
    if (this.rightCanvas) this.rightCanvas.style.display = 'block';
  }

  private hideHTMLCanvases(): void {
    if (this.leftCanvas) this.leftCanvas.style.display = 'none';
    if (this.rightCanvas) this.rightCanvas.style.display = 'none';
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
    this.showHTMLCanvases();
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

    // 한자리 정답: 오른쪽 캔버스만 입력했을 때
    if (isSingleDigit && this.rightDigit && !this.leftDigit) {
      if (userAnswer === correctAnswer) {
        this.handleCorrectAnswer();
      }
      return;
    }

    // 두자리 입력 완료 시
    if (this.leftDigit && this.rightDigit) {
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
        this.clearCanvas('both');
      },
    });
  }

  private nextQuestion(): void {
    this.currentQuestionIndex++;

    if (this.currentQuestionIndex >= this.TOTAL_QUESTIONS) {
      this.endGame();
      return;
    }

    this.clearCanvas('both');
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
    this.hideHTMLCanvases();

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

    // HTML 캔버스 위치 업데이트
    this.updateCanvasPositions();
  }

  private updateCanvasPositions(): void {
    if (!this.leftCanvas || !this.rightCanvas) return;

    const { width, height } = this.scale;
    const gameCanvas = this.game.canvas;
    const rect = gameCanvas.getBoundingClientRect();

    const canvasAreaTop = height * 0.4;
    const canvasAreaHeight = height - canvasAreaTop;
    const gap = 20;
    const totalWidth = this.canvasSize * 2 + gap;
    const startX = (width - totalWidth) / 2;
    const centerY = canvasAreaTop + canvasAreaHeight * 0.35;

    this.leftCanvas.style.left = `${rect.left + startX}px`;
    this.leftCanvas.style.top = `${rect.top + centerY - this.canvasSize / 2}px`;
    this.rightCanvas.style.left = `${rect.left + startX + this.canvasSize + gap}px`;
    this.rightCanvas.style.top = `${rect.top + centerY - this.canvasSize / 2}px`;
  }

  private cleanup(): void {
    // HTML 캔버스 제거
    if (this.leftCanvas) {
      this.leftCanvas.remove();
    }
    if (this.rightCanvas) {
      this.rightCanvas.remove();
    }

    // 타이머 정리
    if (this.recognitionTimer) {
      clearTimeout(this.recognitionTimer);
    }
  }
}
