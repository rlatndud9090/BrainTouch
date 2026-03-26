import Phaser from 'phaser';
import { THEME_PRESETS, COLORFUL_PALETTE } from '../../../shared/colors';
import { createGradientBackground, showStartScreen } from '../../../shared/ui';
import { TopBar, TOP_BAR } from '../../../shared/topBar';
import { FONTS } from '../../../shared/constants';

const THEME = THEME_PRESETS.brainTouch;

interface TargetCircle {
  container: Phaser.GameObjects.Container;
  circle: Phaser.GameObjects.Arc;
  text: Phaser.GameObjects.Text;
  requiredTaps: number;
  currentTaps: number;
  hitArea: Phaser.Geom.Circle;
}

export class MainScene extends Phaser.Scene {
  // 게임 상태
  private score = 0;
  private timeLeft = 30;
  private isPlaying = false;
  private timerEvent?: Phaser.Time.TimerEvent;

  // 타겟 원
  private target: TargetCircle | null = null;
  private fadingHitArea: Phaser.Geom.Circle | null = null; // 사라지는 중인 원의 영역
  private readonly BASE_RADIUS = 45;
  private readonly HIT_AREA_MULTIPLIER = 1.4; // 터치 허용 범위 확장

  // UI 요소
  private topBar!: TopBar;

  constructor() {
    super({ key: 'MainScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // 배경
    createGradientBackground(this, width, height);

    // UI 초기화
    this.createUI();

    // 시작 화면
    this.showStartScreen();

    // 리사이즈 대응
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupResizeListener, this);
  }

  private createUI(): void {
    // 공통 상단 바 생성
    this.topBar = new TopBar(this, {
      left: { type: 'score', initialValue: 0, color: THEME.accentText },
      center: { type: 'lives', maxLives: 3 },
      right: { type: 'time', initialValue: this.timeLeft, color: '#4ecca3' },
    });

    // 대기 화면 동안 숨김 (폰트 로딩 전 깨짐 방지)
    this.topBar.setAlpha(0);
  }

  private showStartScreen(): void {
    showStartScreen(this, {
      title: '🎯 숫자만큼 터치하세요!',
      subtitle: '빈 곳을 터치하면 하트가 줄어요',
      onStart: () => this.startGame(),
    });
  }

  private startGame(): void {
    this.isPlaying = true;
    this.score = 0;
    this.timeLeft = 30;

    // TopBar 표시
    this.topBar.setAlpha(1);
    this.topBar.updateValue('left', 0);
    this.topBar.resetLives('center');

    // 첫 번째 타겟 생성
    this.spawnTarget();

    // 전체 화면 터치 이벤트 (타겟 밖 터치 감지)
    this.input.on('pointerdown', this.handleGlobalTouch, this);

    // 타이머 시작
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true,
    });
  }

  private handleGlobalTouch(pointer: Phaser.Input.Pointer): void {
    if (!this.isPlaying) return;

    const { x, y } = pointer;

    // 현재 활성화된 타겟이 있는 경우
    if (this.target) {
      const circle = this.target.hitArea;
      const distance = Phaser.Math.Distance.Between(x, y, circle.x, circle.y);
      const isInsideHitArea = distance <= circle.radius;

      if (isInsideHitArea) {
        // 타겟 터치 성공
        this.handleTargetTap();
      } else {
        // 빈 곳 터치 - 하트 감소
        this.loseLife();
      }
      return;
    }

    // 원이 사라지는 중인 경우 (fadingHitArea가 있음)
    // 어디를 터치하든 추가 터치 = 실패 (숫자보다 더 많이 터치한 것)
    if (this.fadingHitArea) {
      this.loseLife();
      return;
    }
  }

  private handleTargetTap(): void {
    if (!this.target) return;

    this.target.currentTaps++;

    // 남은 터치 횟수 계산
    const remaining = this.target.requiredTaps - this.target.currentTaps;

    if (remaining <= 0) {
      // 원 완료 - 점수 획득
      const bonusMultiplier = this.target.requiredTaps; // 큰 숫자일수록 보너스
      this.score += 10 * bonusMultiplier;
      this.topBar.updateValue('left', this.score);

      // 사라지는 원의 hitArea 저장 (빈 곳 터치 판정용)
      this.fadingHitArea = this.target.hitArea;

      // 컨테이너 참조를 로컬에 저장하고, 즉시 target을 null로 설정
      // (추가 터치 방지)
      const containerToRemove = this.target.container;
      this.target = null;

      // 원 사라지는 효과
      this.tweens.add({
        targets: containerToRemove,
        scale: 0,
        alpha: 0,
        duration: 150,
        ease: 'Back.easeIn',
        onComplete: () => {
          containerToRemove.destroy();
          this.fadingHitArea = null; // 사라지는 애니메이션 완료
          this.spawnTarget();
        },
      });
    } else {
      // 아직 터치가 남았을 때만 숫자 업데이트 및 효과
      this.target.text.setText(remaining.toString());

      // 터치 효과 - 원이 잠깐 작아졌다가 커지는 효과
      this.tweens.add({
        targets: this.target.container,
        scale: 0.85,
        duration: 50,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }
  }

  private loseLife(): void {
    const isGameOver = this.topBar.loseLife('center');

    // 화면 흔들림 효과
    this.cameras.main.shake(100, 0.01);

    // 화면 빨간색 플래시
    const flash = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0xff0000, 0.3)
      .setOrigin(0)
      .setDepth(50);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });

    if (isGameOver) {
      this.endGame();
    }
  }

  private spawnTarget(): void {
    if (!this.isPlaying) return;

    const { width, height } = this.scale;
    const padding = 80;

    // 랜덤 위치
    const x = Phaser.Math.Between(padding, width - padding);
    const y = Phaser.Math.Between(120, height - padding);

    // 필요한 터치 횟수 (1~5)
    const requiredTaps = Phaser.Math.Between(1, 5);

    // 원 크기 - 터치 횟수가 많을수록 조금 더 크게
    const scale = 0.8 + requiredTaps * 0.1;
    const radius = this.BASE_RADIUS * scale;

    // 랜덤 색상 (공통 팔레트 사용)
    const colorIndex = Phaser.Math.Between(0, COLORFUL_PALETTE.length - 1);
    const color = COLORFUL_PALETTE[colorIndex];

    // 원 생성
    const circle = this.add.circle(0, 0, radius, color);
    circle.setStrokeStyle(3, 0xffffff, 0.3);

    // 숫자 텍스트 (Cherry Bomb One 폰트)
    const text = this.add
      .text(0, 0, requiredTaps.toString(), {
        fontSize: `${Math.floor(radius * 0.95)}px`,
        fontFamily: FONTS.NUMBER,
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // 컨테이너로 묶기
    const container = this.add.container(x, y, [circle, text]);
    container.setDepth(10);

    // 등장 애니메이션
    container.setScale(0);
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // 확장된 터치 영역 (실제 원보다 큰 hitArea)
    const hitRadius = radius * this.HIT_AREA_MULTIPLIER;
    const hitArea = new Phaser.Geom.Circle(x, y, hitRadius);

    this.target = {
      container,
      circle,
      text,
      requiredTaps,
      currentTaps: 0,
      hitArea,
    };
  }

  private updateTimer(): void {
    this.timeLeft--;
    this.topBar.updateValue('right', this.timeLeft);

    // 10초 이하일 때 빨간색으로
    if (this.timeLeft <= 10) {
      this.topBar.setColor('right', '#e94560');
    }

    if (this.timeLeft <= 0) {
      this.endGame();
    }
  }

  private endGame(): void {
    this.isPlaying = false;
    this.timerEvent?.destroy();
    this.input.off('pointerdown', this.handleGlobalTouch, this);

    // 타겟 제거
    if (this.target) {
      this.target.container.destroy();
      this.target = null;
    }
    this.fadingHitArea = null;

    // 결과 화면으로 전환 (gameOver는 ResultScene에서 emit)
    this.scene.start('ResultScene', {
      score: this.score,
      timeUp: this.timeLeft <= 0,
    });
  }

  private cleanupResizeListener(): void {
    this.scale.off('resize', this.handleResize, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width } = gameSize;

    // 상단 바 리사이즈 대응
    this.topBar?.handleResize(width);
  }

  update(): void {
    // 게임 루프 업데이트 (필요 시 사용)
  }
}
