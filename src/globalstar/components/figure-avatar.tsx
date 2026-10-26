import { Avatar, AvatarFallback, AvatarImage } from '@workspace/gdna-ds/components/ui/avatar';

interface FigureAvatarProps {
  name: string;
  imageUrl: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function FigureAvatar({ name, imageUrl, size = 'md' }: FigureAvatarProps) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-16 h-16 text-lg',
    lg: 'w-24 h-24 text-2xl',
    xl: 'w-32 h-32 text-3xl',
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getGradient = (name: string) => {
    const gradients = [
      'from-blue-500 to-purple-600',
      'from-green-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-pink-500 to-rose-600',
      'from-indigo-500 to-blue-600',
      'from-yellow-500 to-orange-600',
    ];
    const index = name.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  return (
    <Avatar className={sizeClasses[size]} data-testid="figure-avatar">
      <AvatarImage src={imageUrl || undefined} alt={name} />
      <AvatarFallback className={`bg-gradient-to-br ${getGradient(name)} text-white font-bold`}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
