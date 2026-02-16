import Phaser from 'phaser';
import { BASE_COLORS } from '../../../shared/colors';
import { createGradientBackground, createButton, showToast } from '../../../shared/ui';
import { FONTS } from '../../../shared/constants';
import { shareGameResult, getShareOutcomeMessage } from '../../../shared/share';

interface ResultData {
  totalTime: number;
}

export class ResultScene extends Phaser.Scene {
  private totalTime = 0;

  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data: ResultData): void {
    this.totalTime = data.totalTime || 0;
  }

  private async shareResult(): Promise<void> {
    const timeSeconds = (this.totalTime / 1000).toFixed(2);
    const outcome = await shareGameResult({
      gameId: 'speed-math',
      gameTitle: '스피드 계산',
      metricLabel: '기록(초)',
      metricValue: timeSeconds,
    });

    const message = getShareOutcomeMessage(outcome);
    if (message) {
      showToast(this, message, {
        color: outcome === 'unsupported' ? '#ff6b6b' : '#4ecca3',
      });
    }
  }

  create(): void {
    const { width, height } = this.scale;

    // 배경
    createGradientBackground(this, width, height);

    // 결과 타이틀
    this.add
      .text(width / 2, height * 0.2, '게임 종료', {
        fontSize: '48px',
        fontFamily: 'Pretendard, sans-serif',
        color: BASE_COLORS.TEXT_PRIMARY,
      })
      .setOrigin(0.5);

    // 기록 시간 라벨
    this.add
      .text(width / 2, height * 0.38, '기록', {
        fontSize: '24px',
        fontFamily: 'Pretendard, sans-serif',
        color: BASE_COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5);

    // 기록 시간 (Cherry Bomb One 폰트)
    const timeSeconds = (this.totalTime / 1000).toFixed(2);
    this.add
      .text(width / 2, height * 0.5, `${timeSeconds}`, {
        fontSize: '72px',
        fontFamily: FONTS.NUMBER,
        color: '#4ecca3',
      })
      .setOrigin(0.5);

    // 초 단위 표시
    this.add
      .text(width / 2, height * 0.6, '초', {
        fontSize: '24px',
        fontFamily: 'Pretendard, sans-serif',
        color: BASE_COLORS.TEXT_SECONDARY,
      })
      .setOrigin(0.5);

    // 버튼들
    createButton(
      this,
      width / 2,
      height * 0.75,
      '다시 도전',
      () => {
        this.scene.start('GameScene');
      },
      {
        bgColor: BASE_COLORS.SUCCESS,
        hoverColor: 0x3dbb92,
        width: 200,
        height: 54,
      }
    );

    createButton(
      this,
      width / 2,
      height * 0.82,
      '공유하기',
      () => {
        void this.shareResult();
      },
      {
        bgColor: 0x5865f2,
        hoverColor: 0x6a75f4,
        textColor: '#ffffff',
        width: 200,
        height: 54,
        triggerOnPointerDown: true,
      }
    );

    createButton(
      this,
      width / 2,
      height * 0.91,
      '홈으로',
      () => {
        this.game.events.emit('gameOver', { totalTime: this.totalTime });
      },
      {
        bgColor: BASE_COLORS.BUTTON_SECONDARY,
        hoverColor: BASE_COLORS.BUTTON_HOVER,
        width: 200,
        height: 54,
      }
    );
  }
}
