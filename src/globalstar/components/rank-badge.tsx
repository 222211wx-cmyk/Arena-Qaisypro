import { Crown, Medal, Award } from 'lucide-react';

interface RankBadgeProps {
  rank: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RankBadge({ rank, size = 'md' }: RankBadgeProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  if (rank === 1) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center font-bold shadow-lg border-2 border-yellow-300`}
        style={{ color: 'hsl(45 100% 20%)' }}
        data-testid="rank-badge-1"
      >
        <Crown className={iconSizes[size]} />
      </div>
    );
  }

  if (rank === 2) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center font-bold shadow-lg border-2 border-gray-200`}
        style={{ color: 'hsl(0 0% 20%)' }}
        data-testid="rank-badge-2"
      >
        <Medal className={iconSizes[size]} />
      </div>
    );
  }

  if (rank === 3) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center font-bold shadow-lg border-2 border-orange-300`}
        style={{ color: 'hsl(25 100% 20%)' }}
        data-testid="rank-badge-3"
      >
        <Award className={iconSizes[size]} />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground border border-border`}
      data-testid={`rank-badge-${rank}`}
    >
      #{rank}
    </div>
  );
}
