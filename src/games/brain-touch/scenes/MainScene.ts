import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
  private score = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private targetCircle!: Phaser.GameObjects.Arc;
  private timeLeft = 30;
  private isPlaying = false;
  private timerEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'MainScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // 배경 그라데이션 효과
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e);
    bg.fillRect(0, 0, width, height);

    // 시작 안내
    const startText = this.add
      .text(width / 2, height / 2, '터치하여 시작', {
        fontSize: '28px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // 점수 텍스트
    this.scoreText = this.add.text(20, 20, '점수: 0', {
      fontSize: '20px',
      fontFamily: 'Pretendard, sans-serif',
      color: '#e94560',
    });

    // 타이머 텍스트
    this.timerText = this.add
      .text(width - 20, 20, `${this.timeLeft}초`, {
        fontSize: '20px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#4ecca3',
      })
      .setOrigin(1, 0);

    // 타겟 원 (초기에는 숨김)
    this.targetCircle = this.add.circle(width / 2, height / 2, 40, 0xe94560);
    this.targetCircle.setVisible(false);
    this.targetCircle.setInteractive();

    // 타겟 터치 시 점수 획득
    this.targetCircle.on('pointerdown', () => {
      if (!this.isPlaying) return;

      this.score += 10;
      this.scoreText.setText(`점수: ${this.score}`);

      // 터치 효과
      this.tweens.add({
        targets: this.targetCircle,
        scale: 1.3,
        duration: 50,
        yoyo: true,
      });

      // 새 위치로 이동
      this.moveTarget();
    });

    // 게임 시작 터치
    this.input.once('pointerdown', () => {
      startText.destroy();
      this.startGame();
    });

    // 리사이즈 대응
    this.scale.on('resize', this.handleResize, this);
  }

  private startGame(): void {
    this.isPlaying = true;
    this.score = 0;
    this.timeLeft = 30;
    this.scoreText.setText('점수: 0');
    this.targetCircle.setVisible(true);
    this.moveTarget();

    // 타이머 시작
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true,
    });
  }

  private updateTimer(): void {
    this.timeLeft--;
    this.timerText.setText(`${this.timeLeft}초`);

    if (this.timeLeft <= 0) {
      this.endGame();
    }
  }

  private endGame(): void {
    this.isPlaying = false;
    this.timerEvent?.destroy();
    this.targetCircle.setVisible(false);

    const { width, height } = this.scale;

    // 게임 오버 화면
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    this.add
      .text(width / 2, height / 2 - 60, '게임 종료!', {
        fontSize: '32px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2, `최종 점수: ${this.score}`, {
        fontSize: '24px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#e94560',
      })
      .setOrigin(0.5);

    const restartText = this.add
      .text(width / 2, height / 2 + 80, '터치하여 다시 시작', {
        fontSize: '18px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#4ecca3',
      })
      .setOrigin(0.5);

    // React에 게임 오버 이벤트 전달
    this.game.events.emit('gameOver', this.score);

    // 다시 시작
    this.input.once('pointerdown', () => {
      overlay.destroy();
      restartText.destroy();
      this.scene.restart();
    });
  }

  private moveTarget(): void {
    const { width, height } = this.scale;
    const padding = 60;

    const x = Phaser.Math.Between(padding, width - padding);
    const y = Phaser.Math.Between(100, height - padding);

    this.targetCircle.setPosition(x, y);

    // 크기 랜덤화 (난이도 조절)
    const scale = Phaser.Math.FloatBetween(0.6, 1.2);
    this.targetCircle.setScale(scale);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;

    // UI 위치 조정
    this.timerText?.setPosition(width - 20, 20);
  }

  update(): void {
    // 게임 루프 업데이트
  }
}
