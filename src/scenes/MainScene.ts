import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload(): void {
    // 에셋 로딩은 여기서
    // this.load.image('logo', 'assets/logo.png');
  }

  create(): void {
    const { width, height } = this.scale;

    // 타이틀 텍스트
    this.titleText = this.add.text(width / 2, height / 2, '🧠 Brain Touch', {
      fontSize: '48px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      stroke: '#16213e',
      strokeThickness: 4,
    });
    this.titleText.setOrigin(0.5);

    // 안내 텍스트
    const guideText = this.add.text(width / 2, height / 2 + 80, '터치하여 시작', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#e94560',
    });
    guideText.setOrigin(0.5);

    // 터치/클릭 이벤트
    this.input.on('pointerdown', () => {
      console.log('게임 시작!');
      // 추후 게임 씬으로 전환
      // this.scene.start('GameScene');
    });

    // 리사이즈 이벤트 대응
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    
    if (this.titleText) {
      this.titleText.setPosition(width / 2, height / 2);
    }
  }

  update(_time: number, _delta: number): void {
    // 매 프레임 업데이트 로직
  }
}

