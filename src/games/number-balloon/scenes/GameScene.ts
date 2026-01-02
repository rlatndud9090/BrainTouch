import Phaser from 'phaser';
import {
  BalloonData,
  generateBalloons,
  getCorrectOrder,
  getRoundConfig,
} from '../utils/BalloonGenerator';
import { showStartScreen } from '../../../shared/ui';
import { TopBar, TOP_BAR } from '../../../shared/topBar';
import { BASE_COLORS } from '../../../shared/colors';

// 게임 색상
const COLORS = {
  BG_SKY: 0x87ceeb,
  TEXT_PRIMARY: '#ffffff',
  TEXT_DARK: '#2c3e50',
  TEXT_SECONDARY: '#7f8c8d',
  HUD_BG: 0x2c3e50,
  SUCCESS: 0x4ecca3,
  FAIL: 0xe94560,
};

// 풍선 물리 설정
const BALLOON_PHYSICS = {
  RESTITUTION: 0.8, // 탄성 (튕김 정도)
  FRICTION: 0, // 마찰 없음
  FRICTION_AIR: 0.01, // 공기 저항 (서서히 느려짐)
  INITIAL_SPEED: 1.5, // 초기 속도
};

// Matter.js 풍선 정보
interface BalloonBody {
  data: BalloonData;
  body: MatterJS.BodyType;
  graphics: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  isPopped: boolean;
}

export class GameScene extends Phaser.Scene {
  // 게임 상태
  private score = 0;
  private round = 1;
  private totalPopped = 0;
  private isPlaying = false;

  // 현재 라운드
  private balloons: BalloonData[] = [];
  private balloonBodies: BalloonBody[] = [];
  private correctOrder: number[] = [];
  private currentIndex = 0;

  // UI 요소
  private topBar!: TopBar;
  private instructionText!: Phaser.GameObjects.Text;
  private difficultyText!: Phaser.GameObjects.Text;

  // 게임 영역
  private gameAreaWidth = 0;
  private gameAreaHeight = 0;
  private gameAreaTop = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // 상태 초기화
    this.score = 0;
    this.round = 1;
    this.totalPopped = 0;
    this.isPlaying = false;
    this.balloonBodies = [];
    this.currentIndex = 0;

    // 레이아웃 계산
    this.calculateLayout(width, height);

    // 배경
    this.createBackground(width, height);

    // HUD
    this.createHUD(width);

    // 안내 텍스트
    this.instructionText = this.add
      .text(width / 2, this.gameAreaTop - 30, '작은 숫자부터 순서대로 터치!', {
        fontSize: '18px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_DARK,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Matter.js 월드 경계 설정 (게임 영역만)
    this.setupWorldBounds(width, height);

    // 시작 화면 표시
    showStartScreen(this, {
      title: '🎈 작은 숫자부터 터치하세요!',
      subtitle: '순서대로 풍선을 터뜨리면 성공',
      onStart: () => this.startGame(),
    });

    // 리사이즈 대응
    this.scale.on('resize', this.handleResize, this);
  }

  update(): void {
    // 풍선 그래픽을 물리 바디 위치에 동기화
    this.balloonBodies.forEach((balloon) => {
      if (balloon.isPopped) return;

      const { body, graphics, text, data } = balloon;
      const x = body.position.x;
      const y = body.position.y;

      // 그래픽 위치 업데이트
      graphics.setPosition(x, y + this.gameAreaTop);
      text.setPosition(x, y + this.gameAreaTop);
    });
  }

  private calculateLayout(width: number, height: number): void {
    const hudHeight = TOP_BAR.HEIGHT;
    const difficultyHeight = 25; // 난이도 텍스트 영역
    const instructionHeight = 40;
    this.gameAreaTop = hudHeight + difficultyHeight + instructionHeight;
    this.gameAreaWidth = width;
    this.gameAreaHeight = height - this.gameAreaTop - 20;
  }

  private setupWorldBounds(width: number, height: number): void {
    // 게임 영역에 벽 설정
    const wallThickness = 50;
    const gameTop = 0;
    const gameBottom = this.gameAreaHeight;
    const gameLeft = 0;
    const gameRight = width;

    // 사각형 경계 생성 (정적 바디)
    this.matter.world.setBounds(
      gameLeft,
      gameTop,
      gameRight - gameLeft,
      gameBottom - gameTop,
      wallThickness,
      true, // left
      true, // right
      true, // top
      true // bottom
    );
  }

  private createBackground(width: number, height: number): void {
    // 하늘색 그라데이션 배경
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xb0e0e6, 0xb0e0e6);
    bg.fillRect(0, 0, width, height);

    // 구름 장식
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

  private createHUD(width: number): void {
    // 공통 상단 바 생성 (배경 포함)
    this.topBar = new TopBar(this, {
      left: { type: 'lives', maxLives: 3 },
      center: { type: 'round', initialValue: 1 },
      right: { type: 'score', initialValue: 0, color: '#ffc947' },
      showBackground: true,
      backgroundColor: COLORS.HUD_BG,
      backgroundAlpha: 0.9,
    });

    // 난이도 표시 (TopBar 바깥)
    const config = getRoundConfig(this.round);
    this.difficultyText = this.add
      .text(width / 2, TOP_BAR.HEIGHT + 10, `풍선 ${config.balloonCount}개`, {
        fontSize: '14px',
        fontFamily: 'Pretendard, sans-serif',
        color: COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5)
      .setDepth(100);
  }

  private prepareRound(): void {
    // 기존 풍선 제거
    this.balloonBodies.forEach((balloon) => {
      this.matter.world.remove(balloon.body);
      balloon.graphics.destroy();
      balloon.text.destroy();
    });
    this.balloonBodies = [];
    this.currentIndex = 0;

    // 풍선 생성
    this.balloons = generateBalloons(this.round, this.gameAreaWidth, this.gameAreaHeight);
    this.correctOrder = getCorrectOrder(this.balloons);

    // 풍선 물리 바디 생성
    this.createBalloonBodies();

    // UI 업데이트
    this.topBar.updateValue('center', this.round);
    const config = getRoundConfig(this.round);
    this.difficultyText.setText(`풍선 ${config.balloonCount}개`);
  }

  private createBalloonBodies(): void {
    this.balloons.forEach((data) => {
      const balloonBody = this.createBalloonBody(data);
      this.balloonBodies.push(balloonBody);
    });
  }

  private createBalloonBody(data: BalloonData): BalloonBody {
    // Matter.js 원형 바디 생성
    const body = this.matter.add.circle(data.x, data.y, data.size, {
      restitution: BALLOON_PHYSICS.RESTITUTION,
      friction: BALLOON_PHYSICS.FRICTION,
      frictionAir: BALLOON_PHYSICS.FRICTION_AIR,
      label: `balloon_${data.id}`,
    });

    // 랜덤 초기 속도 (빙글빙글 떠다니게)
    const speed = BALLOON_PHYSICS.INITIAL_SPEED;
    const angle = Math.random() * Math.PI * 2;
    this.matter.body.setVelocity(body, {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
    });

    // 풍선 그래픽 생성
    const graphics = this.add.graphics();
    this.drawBalloon(graphics, data);
    graphics.setPosition(data.x, data.y + this.gameAreaTop);

    // 숫자 텍스트
    const fontSize = Math.max(data.size * 0.6, 20);
    const text = this.add
      .text(data.x, data.y + this.gameAreaTop, String(data.value), {
        fontSize: `${fontSize}px`,
        fontFamily: 'Pretendard, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // 인터랙티브 설정
    graphics.setInteractive(new Phaser.Geom.Circle(0, 0, data.size), Phaser.Geom.Circle.Contains);

    const balloonBody: BalloonBody = {
      data,
      body,
      graphics,
      text,
      isPopped: false,
    };

    // 클릭 이벤트
    graphics.on('pointerdown', () => {
      if (!this.isPlaying || balloonBody.isPopped) return;
      this.onBalloonTap(balloonBody);
    });

    return balloonBody;
  }

  private drawBalloon(graphics: Phaser.GameObjects.Graphics, data: BalloonData): void {
    // 풍선 본체 (원)
    graphics.fillStyle(data.color, 1);
    graphics.fillCircle(0, 0, data.size);

    // 하이라이트 (빛 반사 효과)
    graphics.fillStyle(0xffffff, 0.3);
    graphics.fillCircle(-data.size * 0.3, -data.size * 0.3, data.size * 0.25);

    // 풍선 꼭지
    graphics.fillStyle(data.color, 1);
    graphics.fillTriangle(-5, data.size, 5, data.size, 0, data.size + 15);

    // 끈
    graphics.lineStyle(2, 0x888888, 0.8);
    graphics.lineBetween(0, data.size + 15, 0, data.size + 40);
  }

  private onBalloonTap(balloon: BalloonBody): void {
    const expectedId = this.correctOrder[this.currentIndex];

    if (balloon.data.id === expectedId) {
      this.handleCorrectTap(balloon);
    } else {
      this.handleWrongTap(balloon);
    }
  }

  private handleCorrectTap(balloon: BalloonBody): void {
    balloon.isPopped = true;
    this.currentIndex++;
    this.totalPopped++;

    // 점수 추가
    const points = 10 * this.round;
    this.score += points;
    this.topBar.updateValue('right', this.score);

    // 터지는 애니메이션
    this.popBalloon(balloon, true);

    // 라운드 클리어 체크
    if (this.currentIndex >= this.balloons.length) {
      this.handleRoundClear();
    }
  }

  private handleWrongTap(balloon: BalloonBody): void {
    // TopBar의 LivesManager를 통해 목숨 감소
    const isGameOver = this.topBar.loseLife('left');

    // 틀린 피드백
    this.showWrongFeedback(balloon);

    // 게임 오버 체크
    if (isGameOver) {
      this.endGame();
    }
  }

  private popBalloon(balloon: BalloonBody, success: boolean): void {
    const { graphics, text, body, data } = balloon;
    const x = graphics.x;
    const y = graphics.y;

    // 물리 바디 비활성화
    this.matter.world.remove(body);

    // 파티클 효과
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

    // 터지는 애니메이션
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

    // 점수 표시
    if (success) {
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
  }

  private showWrongFeedback(balloon: BalloonBody): void {
    // 화면 흔들기
    this.cameras.main.shake(200, 0.01);

    // 풍선에 충격 주기 (튕겨나가게)
    const pushForce = 0.05;
    const angle = Math.random() * Math.PI * 2;
    this.matter.body.applyForce(balloon.body, balloon.body.position, {
      x: Math.cos(angle) * pushForce,
      y: Math.sin(angle) * pushForce,
    });

    // X 표시
    const xMark = this.add
      .text(balloon.graphics.x, balloon.graphics.y, '❌', {
        fontSize: '40px',
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
    this.round++;

    // 라운드 클리어 표시
    const clearText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, '🎉 Clear!', {
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

  private startGame(): void {
    this.isPlaying = true;
    this.instructionText.setAlpha(1);
    this.prepareRound();
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

    // 상단 바 리사이즈 대응
    this.topBar?.handleResize(width);

    // 난이도 텍스트 위치 조정
    this.difficultyText?.setPosition(width / 2, TOP_BAR.HEIGHT + 10);
  }
}
