import Phaser from 'phaser';
import { BASE_COLORS, THEME_PRESETS } from '../../../shared/colors';
import { createGradientBackground, createButton } from '../../../shared/ui';

const THEME = THEME_PRESETS.brainTouch;

interface ResultData {
  score: number;
  timeUp: boolean;
}

export class ResultScene extends Phaser.Scene {
  private resultData!: ResultData;

  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data: ResultData): void {
    this.resultData = data;
  }

  create(): void {
    const { width, height } = this.scale;

    // 배경
    createGradientBackground(this, width, height, BASE_COLORS.BG_DARK, BASE_COLORS.BG_PRIMARY);

    // 결과 제목
    const titleText = this.resultData.timeUp ? '⏱️ 시간 종료!' : '💔 게임 오버';
    const titleColor = this.resultData.timeUp ? '#4ecca3' : THEME.accentText;

    this.add
      .text(width / 2, height * 0.25, titleText, {
        fontSize: '36px',
        fontFamily: 'Pretendard, sans-serif',
        color: titleColor,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // 점수 라벨
    this.add
      .text(width / 2, height * 0.4, '최종 점수', {
        fontSize: '18px',
        fontFamily: 'Pretendard, sans-serif',
        color: BASE_COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5);

    // 점수 표시 (애니메이션)
    const scoreText = this.add
      .text(width / 2, height * 0.5, '0', {
        fontSize: '64px',
        fontFamily: 'Pretendard, sans-serif',
        color: THEME.accentText,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // 점수 카운트업 애니메이션
    this.tweens.addCounter({
      from: 0,
      to: this.resultData.score,
      duration: 800,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        scoreText.setText(Math.floor(tween.getValue()).toString());
      },
    });

    // 등급 표시
    const grade = this.getGrade(this.resultData.score);
    const gradeText = this.add
      .text(width / 2, height * 0.62, grade, {
        fontSize: '28px',
        fontFamily: 'Pretendard, sans-serif',
        color: '#ffc947',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // 등급 등장 애니메이션
    this.time.delayedCall(900, () => {
      this.tweens.add({
        targets: gradeText,
        alpha: 1,
        scale: { from: 1.5, to: 1 },
        duration: 300,
        ease: 'Back.easeOut',
      });
    });

    // 버튼들
    this.time.delayedCall(1200, () => {
      // 다시하기 버튼
      createButton(this, width / 2, height * 0.78, '🔄 다시하기', () => {
        this.scene.start('MainScene');
      }, {
        bgColor: THEME.accent,
        hoverColor: THEME.accentHover,
        width: 180,
        height: 50,
      });

      // 홈으로 버튼
      createButton(this, width / 2, height * 0.88, '🏠 홈으로', () => {
        // React 라우터로 홈 이동
        window.history.back();
      }, {
        bgColor: BASE_COLORS.BUTTON_SECONDARY,
        hoverColor: BASE_COLORS.BUTTON_HOVER,
        width: 180,
        height: 50,
      });
    });
  }

  private getGrade(score: number): string {
    if (score >= 1500) return '🏆 레전드!';
    if (score >= 1000) return '⭐ 마스터';
    if (score >= 700) return '🎯 프로';
    if (score >= 400) return '👍 좋아요';
    if (score >= 200) return '😊 괜찮아요';
    return '💪 다시 도전!';
  }
}

