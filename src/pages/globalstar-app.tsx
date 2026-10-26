import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@workspace/gdna-ds/components/ui/tooltip';
import GameExitButton from '@/components/GameExitButton';
import { Toaster } from '@workspace/gdna-ds/components/ui/toaster';
import { Router as WouterRouter, Switch, Route } from 'wouter';
import { LanguageProvider } from '@/globalstar/contexts/language-context';

import Home from '@/globalstar/pages/home';
import Ranking from '@/globalstar/pages/ranking';
import FigureDetail from '@/globalstar/pages/figure-detail';
import News from '@/globalstar/pages/news';
import Traditions from '@/globalstar/pages/traditions';
import About from '@/globalstar/pages/about';
import EarningsPage from '@/globalstar/pages/earnings';
import AdminWithdrawals from '@/globalstar/pages/admin-withdrawals';

const gsQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

export default function GlobalStarApp() {
  return (
    <QueryClientProvider client={gsQueryClient}>
      <LanguageProvider>
        <TooltipProvider>
          {/* زر الخروج الطارئ من لعبة GlobalStar + حماية من البلوكاج */}
          <GameExitButton />
          <WouterRouter base="/games/globalstar">
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/ranking" component={Ranking} />
              <Route path="/figures/:id" component={FigureDetail} />
              <Route path="/news" component={News} />
              <Route path="/traditions" component={Traditions} />
              <Route path="/about" component={About} />
              <Route path="/earnings" component={EarningsPage} />
              <Route path="/admin/withdrawals" component={AdminWithdrawals} />
            </Switch>
          </WouterRouter>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
