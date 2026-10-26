import { useState } from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp } from 'lucide-react';
import { Button } from '@workspace/gdna-ds/components/ui/button';
import { useVoteGsFigure, getGetGsFiguresQueryKey, getGetGsRankingQueryKey, getGetGsFigureQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@workspace/gdna-ds/hooks/use-toast';
import { useLanguage } from '@/globalstar/contexts/language-context';
import { newsVoteCopy } from '@/globalstar/i18n/news-vote-copy';

interface VoteButtonProps {
  figureId: number;
  currentVotes: number;
  size?: 'sm' | 'md' | 'lg';
}

export function VoteButton({ figureId, currentVotes, size = 'md' }: VoteButtonProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [displayVotes, setDisplayVotes] = useState(currentVotes);
  const voteMutation = useVoteGsFigure();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language, isRTL } = useLanguage();
  const { vote: c, locale } = newsVoteCopy(language);
  const formattedVotes = new Intl.NumberFormat(locale).format(displayVotes);

  const sizeClasses = {
    sm: 'h-8 text-xs',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base',
  };

  const handleVote = async () => {
    if (isVoting) return;
    
    setIsVoting(true);
    setDisplayVotes((prev) => prev + 1);

    voteMutation.mutate(
      { figureId },
      {
        onSuccess: (data) => {
          setDisplayVotes(data.newVotes);
          queryClient.invalidateQueries({ queryKey: getGetGsFiguresQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetGsRankingQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetGsFigureQueryKey(figureId) });
          
          toast({
            title: c.recorded,
            description: c.newRank(new Intl.NumberFormat(locale).format(data.newRank)),
          });
          
          setTimeout(() => setIsVoting(false), 1000);
        },
        onError: () => {
          setDisplayVotes(currentVotes);
          setIsVoting(false);
          toast({
            title: c.failed,
            description: c.tryAgain,
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <Button
      onClick={handleVote}
      disabled={isVoting}
      className={`${sizeClasses[size]} gap-2`}
      data-testid={`vote-button-${figureId}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label={isVoting ? c.submitting(formattedVotes) : c.button(formattedVotes)}
    >
      <motion.div
        animate={isVoting ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 0.4 }}
      >
        <ThumbsUp className="w-4 h-4" />
      </motion.div>
      <span className="font-mono">{formattedVotes}</span>
      <span>{c.votes}</span>
    </Button>
  );
}
