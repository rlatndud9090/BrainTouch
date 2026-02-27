import Phaser from 'phaser';
import { BASE_COLORS, THEME_PRESETS } from '../../../shared/colors';
import { createGradientBackground, createButton, showToast } from '../../../shared/ui';
import { FONTS } from '../../../shared/constants';
import { shareGameResultWithFeedback } from '../../../shared/share';

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
    const titleText = '게임 종료';
    const titleColor = THEME.accentText;

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

    // 점수 표시 (애니메이션 - Cherry Bomb One 폰트)
    const scoreText = this.add
      .text(width / 2, height * 0.5, '0', {
        fontSize: '64px',
        fontFamily: FONTS.NUMBER,
        color: THEME.accentText,
      })
      .setOrigin(0.5);

    // 점수 카운트업 애니메이션
    this.tweens.addCounter({
      from: 0,
      to: this.resultData.score,
      duration: 800,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        const value = tween.getValue();
        if (value !== null) {
          scoreText.setText(Math.floor(value).toString());
        }
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
      const buttonHeight = 54;
      const buttonGap = 16;
      const bottomMargin = 24;
      const menuButtonY = height - bottomMargin - buttonHeight / 2;
      const shareButtonY = menuButtonY - (buttonHeight + buttonGap);
      const retryButtonY = shareButtonY - (buttonHeight + buttonGap);
      // 다시하기 버튼
      createButton(
        this,
        width / 2,
        retryButtonY,
        '다시 도전',
        () => {
          this.scene.start('MainScene');
        },
        {
          bgColor: THEME.accent,
          hoverColor: THEME.accentHover,
          width: 200,
          height: buttonHeight,
        }
      );

      // 공유하기 버튼
      createButton(
        this,
        width / 2,
        shareButtonY,
        '공유하기',
        () => {
          void shareGameResultWithFeedback(
            {
              gameId: 'brain-touch',
              gameTitle: '몸풀기 터치',
              metricLabel: '점수',
              metricValue: this.resultData.score,
            },
            (message, options) => {
              showToast(this, message, options);
            }
          );
        },
        {
          bgColor: 0x5865f2,
          hoverColor: 0x6a75f4,
          textColor: '#ffffff',
          width: 200,
          height: buttonHeight,
          triggerOnPointerDown: true,
        }
      );

      // 홈으로 버튼
      createButton(
        this,
        width / 2,
        menuButtonY,
        '홈으로',
        () => {
          // React에 게임 종료 이벤트 전달 → 홈으로 이동
          this.game.events.emit('gameOver', this.resultData.score);
        },
        {
          bgColor: BASE_COLORS.BUTTON_SECONDARY,
          hoverColor: BASE_COLORS.BUTTON_HOVER,
          width: 200,
          height: buttonHeight,
        }
      );
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
