import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createHighResScale, waitForFonts } from '../shared/constants';

interface PhaserGameProps {
  gameId: string;
  onGameOver?: (score: number) => void;
}

export default function PhaserGame({ gameId, onGameOver }: PhaserGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;
    let disposed = false;

    // 폰트 로딩 완료 후 게임 시작
    const loadGame = async () => {
      try {
        // 폰트 로딩 대기 (Cherry Bomb One 등)
        await waitForFonts();
        if (disposed) return;

        // 게임별 설정 동적 import
        const gameModule = await import(`../games/${gameId}/config.ts`);
        if (disposed) return;

        const container = containerRef.current;
        if (!container) return;

        const config = gameModule.getGameConfig(container, onGameOver);
        const game = new Phaser.Game(config);

        if (disposed) {
          game.destroy(true);
          return;
        }

        gameRef.current = game;
      } catch (error) {
        if (!disposed) {
          console.error(`Failed to load game: ${gameId}`, error);
        }
      }
    };

    loadGame();

    // Cleanup
    return () => {
      disposed = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [gameId, onGameOver]);

  // 리사이즈 핸들러
  useEffect(() => {
    const handleResize = () => {
      if (gameRef.current && containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const scale = createHighResScale(clientWidth, clientHeight);
        gameRef.current.scale.resize(scale.width, scale.height);
        gameRef.current.scale.setZoom(scale.zoom);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      style={{ touchAction: 'none' }}
    />
  );
}
