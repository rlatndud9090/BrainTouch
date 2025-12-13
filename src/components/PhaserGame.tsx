import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

interface PhaserGameProps {
  gameId: string;
  onGameOver?: (score: number) => void;
}

export default function PhaserGame({ gameId, onGameOver }: PhaserGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // 동적으로 게임 설정 가져오기
    const loadGame = async () => {
      try {
        // 게임별 설정 동적 import
        const gameModule = await import(`../games/${gameId}/config.ts`);
        const config = gameModule.getGameConfig(containerRef.current!, onGameOver);
        
        gameRef.current = new Phaser.Game(config);
      } catch (error) {
        console.error(`Failed to load game: ${gameId}`, error);
      }
    };

    loadGame();

    // Cleanup
    return () => {
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
        gameRef.current.scale.resize(clientWidth, clientHeight);
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

