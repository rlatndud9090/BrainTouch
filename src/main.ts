import Phaser from 'phaser';
import { gameConfig } from './game/config';

// 게임 인스턴스 생성
const game = new Phaser.Game(gameConfig);

// 윈도우 리사이즈 대응 (모바일 웹뷰 최적화)
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

export default game;
