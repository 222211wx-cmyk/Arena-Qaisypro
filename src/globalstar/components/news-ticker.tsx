import { useGetGsTicker } from '@workspace/api-client-react';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/language-context';
import { newsVoteCopy } from '@/globalstar/i18n/news-vote-copy';

export function NewsTicker() {
  const { language, isRTL } = useLanguage();
  const { news: c } = newsVoteCopy(language);
  const { data: tickerData } = useGetGsTicker();

  if (!tickerData?.items || tickerData.items.length === 0) {
    return null;
  }

  const items = [...tickerData.items, ...tickerData.items];

  return (
    <div
      className="bg-card border-b border-border overflow-hidden"
      data-testid="news-ticker"
      aria-label={c.ticker}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="relative h-10 flex items-center">
        <div className={`absolute inset-y-0 start-0 w-24 ${isRTL ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-card to-transparent z-10 pointer-events-none`} />
        <div className={`absolute inset-y-0 end-0 w-24 ${isRTL ? 'bg-gradient-to-r' : 'bg-gradient-to-l'} from-card to-transparent z-10 pointer-events-none`} />
        
        <div className="flex ticker-scroll">
          {items.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="flex items-center gap-3 px-6 whitespace-nowrap"
              data-testid={`ticker-item-${item.id}`}
            >
              {item.isBreaking && (
                <span className="flex items-center gap-1 text-destructive font-bold text-xs pulse-breaking">
                  <AlertCircle className="w-3 h-3" />
                  {c.breaking}
                </span>
              )}
              <span className="text-sm text-muted-foreground">{item.domain}</span>
              <span className="text-sm text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
