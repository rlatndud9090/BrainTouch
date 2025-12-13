import { Link } from 'react-router-dom';

interface GameCardProps {
  id: string;
  title: string;
  description: string;
  color: string;
}

export default function GameCard({ id, title, description, color }: GameCardProps) {
  return (
    <Link to={`/game/${id}`}>
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${color} p-5 min-h-[140px] active:scale-[0.98] transition-transform`}>
        {/* 배경 장식 */}
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full" />
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full" />
        
        {/* 컨텐츠 */}
        <div className="relative z-10">
          <h3 className="text-2xl font-bold text-white mb-2">
            {title}
          </h3>
          <p className="text-white/80 text-sm">
            {description}
          </p>
        </div>

        {/* 플레이 버튼 */}
        <div className="absolute right-4 bottom-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <span className="text-white text-lg">▶</span>
        </div>
      </div>
    </Link>
  );
}

