import { Switch, Route, Redirect, Router as WouterRouter, useLocation, useSearch } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@workspace/gdna-ds/components/ui/toaster";
import { TooltipProvider } from "@workspace/gdna-ds/components/ui/tooltip";
import { useEffect } from "react";
import { BackButton } from "@/components/layout/back-button";
import { isMessagesEntryPath, MESSAGES_ENTRY_PATH, messagesReturnPath } from "@/lib/messages-entry";

import { AuthProvider } from "@/contexts/AuthContext";
import { LangProvider } from "@/contexts/LangContext";
import { LegalProvider } from "@/contexts/LegalContext";
import { GlobalCallBoundary } from "@/contexts/GlobalCallBoundary";
import { ConnectivityProvider } from "@/contexts/ConnectivityContext";
import CookieBanner from "@/components/legal/CookieBanner";
import AgeGate from "@/components/legal/AgeGate";
import GeoBlock from "@/components/legal/GeoBlock";
import { Navbar } from "@/components/layout/navbar";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import Home from "@/pages/home";
import Login from "@/pages/login";
import RecoverAccount from "@/pages/recover-account";
import RecoveryPhone from "@/pages/recovery-phone";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Games from "@/pages/games";
import NeonRacerGame from "@/pages/game-neon-racer";
import CryptoClashGame from "@/pages/game-crypto-clash";
import ArenaStrikeGame from "@/pages/game-arena-strike";
import PenaltyKingGame from "@/pages/game-penalty-king";
import NewsPage from "@/pages/news";
import Leaderboard from "@/pages/leaderboard";
import ChatPage from "@/pages/chat";
import Wallet from "@/pages/wallet";
import NotFound from "@/pages/not-found";
import GlobalStarApp from "@/pages/globalstar-app";
import LegendsPage from "@/pages/legends";
import LegendHubPage from "@/pages/legend-hub";
import ElitePage from "@/pages/elite";
import EliteProfilePage from "@/pages/elite-profile";
import PulsePage from "@/pages/pulse";
import ClipsPage from "@/pages/clips";
import CitizensPage from "@/pages/citizens";
import CitizenPage from "@/pages/citizen";
import CitizenDiscoverPage from "@/pages/citizen-discover";
import CitizenProfilePage from "@/pages/citizen-profile";
import CitizenMarketPage from "@/pages/citizen-market";
import CitizenServicesPage from "@/pages/citizen-services";
import CitizenMapPage from "@/pages/citizen-map";
import EmpireEternalPage from "@/pages/empire-eternal";
import LearnPage from "@/pages/learn";
import StoriesPage from "@/pages/stories";
import EventsPage from "@/pages/events";
import MessagesPage from "@/pages/messages";
import MissedCallsPage from "@/pages/missed-calls";
import CelebrationsPage from "@/pages/celebrations";
import Hub from "@/pages/hub";
import Empire from "@/pages/empire";
import Legal from "@/pages/legal";
import Chronicle from "@/pages/chronicle";
import Welcome from "@/pages/welcome";
import SocialPage  from "@/pages/social";
import InvitePage   from "@/pages/invite";
import Growth       from "@/pages/growth";
import AmeeqPage    from "@/pages/ameeq";
import PressPage    from "@/pages/press";
import SportPage    from "@/pages/sport";
import MusicPage    from "@/pages/music";
import ShopPage     from "@/pages/shop";
import FriendsPage  from "@/pages/friends";
import NeuralCorePage from "@/pages/neural-core";
import GenomePage from "@/pages/genome";
import SmartPage from "@/pages/smart";
import FortressPage from "@/pages/fortress";
import SearchPage from "@/pages/search";
import AmisPage from "@/pages/amis";
import { Footer } from "@/components/layout/footer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import CinemaPage   from "@/pages/cinema";
import AdminRevenuePage from "@/pages/admin-revenue";
import FinanceOnboarding from "@/pages/finance-onboarding";
import AdminFinance from "@/pages/admin-finance";
import AdminClipThumbnailsPage from "@/pages/admin-clip-thumbnails";
import RoyalVerificationPage from "@/pages/royal-verification";
// NOTE: /partners/operators and /partners/dashboard are served through the Lite
// shell (see vite `liteShell` + src/lite/pages-partners.ts) at their exact root
// URLs, so they are intentionally NOT React routes here.
import RecoveryCodePage from "@/pages/recovery-code";
import RecoverWithCode from "@/pages/recover-with-code";

const queryClient = new QueryClient();

function RealtimeQuerySync() {
  const client = useQueryClient();
  useEffect(() => {
    const refetch = () => {
      void client.invalidateQueries();
    };
    window.addEventListener("gdna:realtime-refetch", refetch);
    return () => window.removeEventListener("gdna:realtime-refetch", refetch);
  }, [client]);
  return null;
}

function ArenaDocumentTitle() {
  const [location] = useLocation();
  const search = useSearch();

  useEffect(() => {
    const messenger = isMessagesEntryPath(location) ||
      ((location === "/login" || location === "/register") && messagesReturnPath(search) !== null);
    const title = "Hm Messages — Helixly";
    const description = "Hm Messages — your conversations, groups and calls on Helixly.";
    const metadata = [
      ['meta[name="description"]', "content", description],
      ['meta[name="application-name"]', "content", "Hm Messages"],
      ['meta[property="og:title"]', "content", title],
      ['meta[property="og:description"]', "content", description],
      ['meta[name="twitter:title"]', "content", title],
      ['meta[name="twitter:description"]', "content", description],
      ['link[rel="canonical"]', "href", "/messages"],
      ['meta[property="og:url"]', "content", "/messages"],
    ] as const;
    if (messenger) {
      const previousTitle = document.title;
      const previous = metadata.map(([selector, attribute, value]) => {
        const element = document.querySelector(selector);
        const old = element?.getAttribute(attribute);
        element?.setAttribute(attribute, value);
        return [element, attribute, old] as const;
      });
      document.title = title;
      return () => {
        if (document.title === title) document.title = previousTitle;
        previous.forEach(([element, attribute, old]) => {
          if (old == null) element?.removeAttribute(attribute);
          else element?.setAttribute(attribute, old);
        });
      };
    }
    // Keep any meaningful title supplied by a page, while ensuring every
    // browser tab carries the public ARENA brand.
    const ensureArenaTitle = () => {
      const current = document.title.trim();
      if (!current || !current.toLocaleUpperCase().includes("ARENA")) {
        document.title = current ? `ARENA — ${current}` : "ARENA";
      }
    };
    ensureArenaTitle();
    // A page may set a meaningful title after it mounts. Observe those
    // updates rather than replacing the page title, and only add the brand.
    const observer = new MutationObserver(ensureArenaTitle);
    observer.observe(document.querySelector("title") ?? document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [location, search]);

  return null;
}

function PageWrapper() {
  const [location] = useLocation();
  return (
    <main key={location} className="flex-1 page-transition">
      <ErrorBoundary key={location}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login"><Login /></Route>
          <Route path="/recover-account" component={RecoverAccount} />
          <Route path="/recovery-phone" component={RecoveryPhone} />
          <Route path="/recovery-code" component={RecoveryCodePage} />
          <Route path="/recover-with-code" component={RecoverWithCode} />
          <Route path="/register" component={Register} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/hub" component={Hub} />
          <Route path="/empire" component={Empire} />
          <Route path="/legal" component={Legal} />
          <Route path="/legal/:tab" component={Legal} />
          <Route path="/chronicle" component={Chronicle} />
          <Route path="/welcome" component={Welcome} />
          <Route path="/social"   component={SocialPage}  />
          <Route path="/invite"   component={InvitePage}  />
          <Route path="/growth"   component={Growth}      />
          <Route path="/ameeq"    component={AmeeqPage}   />
          <Route path="/sport"    component={SportPage}   />
          <Route path="/music"    component={MusicPage}   />
          <Route path="/cinema"   component={CinemaPage}  />
          <Route path="/shop"     component={ShopPage}    />
          <Route path="/friends"  component={FriendsPage} />
          <Route path="/games" component={Games} />
          <Route path="/games/neon-racer" component={NeonRacerGame} />
          <Route path="/games/crypto-clash" component={CryptoClashGame} />
          <Route path="/games/arena-strike" component={ArenaStrikeGame} />
          <Route path="/games/penalty-king" component={PenaltyKingGame} />
          <Route path="/games/globalstar" component={GlobalStarApp} />
          <Route path="/games/globalstar/admin/withdrawals" component={GlobalStarApp} />
          <Route path="/games/globalstar/figures/:id" component={GlobalStarApp} />
          <Route path="/games/globalstar/:rest*" component={GlobalStarApp} />
          <Route path="/legends" component={LegendsPage} />
          <Route path="/legends/:id" component={LegendHubPage} />
          <Route path="/elite" component={ElitePage} />
          <Route path="/elite/:slug" component={EliteProfilePage} />
          <Route path="/pulse" component={PulsePage} />
          <Route path="/clips" component={ClipsPage} />
          <Route path="/clip" component={ClipsPage} />
          <Route path="/citizens" component={CitizenDiscoverPage} />
          <Route path="/citizens/ranks" component={CitizensPage} />
          <Route path="/u/:username" component={CitizenProfilePage} />
          <Route path="/market" component={CitizenMarketPage} />
          <Route path="/souk" component={CitizenMarketPage} />
          <Route path="/services" component={CitizenServicesPage} />
          <Route path="/map" component={CitizenMapPage} />
          <Route path="/citizen/:username" component={CitizenPage} />
          <Route path="/empire-eternal" component={EmpireEternalPage} />
          <Route path="/learn" component={LearnPage} />
          <Route path="/stories" component={StoriesPage} />
          <Route path="/events" component={EventsPage} />
          <Route path={MESSAGES_ENTRY_PATH} component={MessagesPage} />
          <Route path="/mes" component={MessagesPage} />
          <Route path={`${MESSAGES_ENTRY_PATH}/`} component={MessagesPage} />
          <Route path="/message-calle">
            <Redirect to={`${MESSAGES_ENTRY_PATH}${window.location.search}${window.location.hash}`} replace />
          </Route>
          <Route path="/messages.call">
            <Redirect to={`${MESSAGES_ENTRY_PATH}${window.location.search}${window.location.hash}`} replace />
          </Route>
          <Route path="/messagerie">
            <Redirect to={`${MESSAGES_ENTRY_PATH}${window.location.search}${window.location.hash}`} replace />
          </Route>
          <Route path="/message%20calle">
            <Redirect to={`${MESSAGES_ENTRY_PATH}${window.location.search}${window.location.hash}`} replace />
          </Route>
          <Route path="/message calle">
            <Redirect to={`${MESSAGES_ENTRY_PATH}${window.location.search}${window.location.hash}`} replace />
          </Route>
          <Route path="/missed-calls" component={MissedCallsPage} />
          <Route path="/celebrations" component={CelebrationsPage} />
          <Route path="/press" component={PressPage} />
          <Route path="/neural-core" component={NeuralCorePage} />
          <Route path="/genome" component={GenomePage} />
          <Route path="/smart" component={SmartPage} />
          <Route path="/fortress" component={FortressPage} />
          <Route path="/search" component={SearchPage} />
          <Route path="/amis" component={AmisPage} />
          <Route path="/news" component={NewsPage} />
          <Route path="/leaderboard" component={Leaderboard} />
          <Route path="/chat" component={ChatPage} />
          <Route path="/wallet" component={Wallet} />
          <Route path="/finance/onboarding" component={FinanceOnboarding} />
          <Route path="/royal-verification" component={RoyalVerificationPage} />
          <Route path="/admin/revenue" component={AdminRevenuePage} />
          <Route path="/admin/finance" component={AdminFinance} />
          <Route path="/admin/clips/thumbnails" component={AdminClipThumbnailsPage} />
          <Route component={NotFound} />
        </Switch>
      </ErrorBoundary>
    </main>
  );
}
function Router() {
  const [location] = useLocation();
  const search = useSearch();
  const isChoiceEntry = location === "/login";
  const isMessagesEntry = isMessagesEntryPath(location) ||
    ((location === "/login" || location === "/register") && messagesReturnPath(search) !== null);
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/30 selection:text-white">
      <ArenaDocumentTitle />
      <div className="sticky top-0 z-50">
      <BackButton />
      {!isChoiceEntry && !isMessagesEntry && <Navbar />}
      {isMessagesEntry && (
        <header className="border-b border-border bg-background">
          <div className="mx-auto flex max-w-6xl justify-end px-3 py-2">
            <LanguageSwitcher />
          </div>
        </header>
      )}
      </div>
      <PageWrapper />
      {!isChoiceEntry && !isMessagesEntry && <Footer />}
      <CookieBanner />
      <AgeGate />
      <GeoBlock />
    </div>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeQuerySync />
      <TooltipProvider>
        <LangProvider>
          <ConnectivityProvider>
            <LegalProvider>
              <AuthProvider>
                <GlobalCallBoundary>
                  <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                    <Router />
                  </WouterRouter>
                  <Toaster />
                </GlobalCallBoundary>
              </AuthProvider>
            </LegalProvider>
          </ConnectivityProvider>
        </LangProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
