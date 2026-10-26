/** Explicit local demonstration data. Never represents real accounts or money. */
export const STANDALONE_MODE = true;
const SESSION_KEY = "arena:demo:session:v1";
export const guestUser = {
  id: 1, name: "Guest", username: "Guest", balance: 1000, xp: 0,
  gamesPlayed: 0, wins: 0, canClaimDaily: true, isAdmin: false,
  isAdult: null as boolean | null,
};
export type DemoUser = typeof guestUser;
let memoryUser: DemoUser = { ...guestUser };
export function getDemoUser(): DemoUser {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
    if (raw && raw.id === 1 && typeof raw.username === "string") {
      memoryUser = { ...guestUser, ...raw, isAdmin: false };
    }
  } catch { /* Storage can be unavailable or contain corrupt demo data. */ }
  return saveDemoUser(memoryUser);
}
export function saveDemoUser(user: DemoUser): DemoUser {
  memoryUser = { ...user, id: 1, isAdmin: false };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(memoryUser)); } catch { /* In-memory demo still works. */ }
  return { ...memoryUser };
}
export function resetDemoUser() { return saveDemoUser({ ...guestUser }); }
export const mockUsers = [guestUser, { ...guestUser, id: 2, username: "Demo Champion", xp: 1500, wins: 12 }];
export const mockLeaderboard = [...mockUsers].sort((a, b) => b.xp - a.xp);
export const mockTournaments = [{ id: 1, name: "Arena Demo Cup", status: "open", participants: 100 }];
export const mockDomains = [{ id: "sport", label: "Demo Sports", icon: "🏆", figureCount: 2, totalVotes: 42 }];
export const mockFigures = [1, 2].map((id) => ({ id, domain: "sport", domainLabel: "Demo Sports", name: `Demo Athlete ${id}`, imageUrl: "", bio: "Fictional standalone demo profile", nationality: "Demo", rank: id, recentVotes: 2, voteTrend: 1, votes: 23 - id }));
export const mockTables: Record<string, unknown[]> = {
  gs_domains: mockDomains, gs_figures: mockFigures,
  gs_articles: [{ id: 1, domain: "sport", title: "Welcome to the Arena demo", summary: "Explore with local sample data. No backend is connected.", source: "Local demo", imageUrl: "", publishedAt: "2026-01-01T00:00:00Z", domainLabel: "Demo Sports", isBreaking: false }],
  gs_traditions: [{ id: 1, name: "Arena celebration", country: "Demo", category: "Cultural", description: "Fictional demo content", imageUrl: "", period: "Modern", isArchaeological: false }],
  gs_ticker: [{ id: 1, domain: "sport", text: "Standalone demo — all scores and votes are local examples", isBreaking: false }],
};
export function getTournaments() { return mockTournaments; }
export function playDemoTournament() {
  const user = getDemoUser();
  const next = saveDemoUser({ ...user, balance: user.balance + 100, xp: user.xp + 50, gamesPlayed: user.gamesPlayed + 1, wins: user.wins + 1 });
  return { placement: 1, coinsEarned: 100, xpEarned: 50, tier: "Demo", isWin: true,
    newBalance: next.balance, newXp: next.xp, username: next.username,
    message: "Local demo result — no real rewards", top10: mockLeaderboard.map(p => ({ username: p.username, xp: p.xp })) };
}
type DemoShot = { number: number; direction: string; keeperDirection: string; goal: boolean };
let penaltyShots: DemoShot[] = [];
export function playDemoPenalty(direction: unknown, restart: unknown) {
  if (restart === true || penaltyShots.length >= 5) penaltyShots = [];
  const aim = ["left", "center", "right"].includes(String(direction)) ? String(direction) : "center";
  const keeperDirection = ["left", "center", "right"][penaltyShots.length % 3];
  penaltyShots.push({ number: penaltyShots.length + 1, direction: aim, keeperDirection, goal: aim !== keeperDirection });
  const goals = penaltyShots.filter(shot => shot.goal).length;
  const complete = penaltyShots.length === 5;
  const xpEarned = complete ? goals * 10 : 0;
  if (complete) {
    const user = getDemoUser();
    saveDemoUser({ ...user, xp: user.xp + xpEarned, gamesPlayed: user.gamesPlayed + 1, wins: user.wins + (goals >= 3 ? 1 : 0) });
  }
  return { matchId: "local-demo-penalty", shots: [...penaltyShots], shotNumber: penaltyShots.length,
    totalShots: 5, goals, saves: penaltyShots.length - goals, complete, win: complete && goals >= 3,
    xpEarned, keeperDirection, goal: penaltyShots[penaltyShots.length - 1].goal, message: "Local demo match" };
}
export async function demoApi(path: string, method = "GET", body: Record<string, unknown> = {}): Promise<Response> {
  const url = new URL(path, "https://demo.invalid");
  const p = url.pathname;
  let data: unknown;
  let status = 200;
  if (p === "/api/auth/me") data = getDemoUser();
  else if (p === "/api/auth/logout") data = resetDemoUser();
  else if (p === "/api/auth/login" || p === "/api/auth/register") data = saveDemoUser({ ...getDemoUser(), username: String(body.username || "Guest"), name: String(body.username || "Guest") });
  else if (p === "/api/auth/birth-date") {
    const raw = String(body.birthDate ?? "");
    const birth = new Date(`${raw}T00:00:00Z`);
    const now = new Date();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || !Number.isFinite(birth.getTime()) || birth > now) {
      status = 400; data = { error: "Enter a valid birth date" };
    } else {
      let age = now.getUTCFullYear() - birth.getUTCFullYear();
      if (now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) age--;
      data = saveDemoUser({ ...getDemoUser(), isAdult: age >= 18 });
    }
  }
  else if (p === "/api/leaderboard") data = { players: [getDemoUser(), ...mockLeaderboard.filter(p => p.id !== 1)] };
  else if (p === "/api/tournaments") data = { tournaments: mockTournaments };
  else if (p === "/api/games/globalstar/tournament") data = playDemoTournament();
  else if (p === "/api/games/penalty-king/play") data = playDemoPenalty(body.direction, body.restart);
  else if (["/api/games/arena-strike/play", "/api/games/neon-racer/play", "/api/games/crypto-clash/play"].includes(p)) data = { ...playDemoTournament(), win: true };
  else if (p === "/api/archon/daily-directive") data = { directive: { id: 1, directive: "Explore the standalone Arena demo", completed: false, createdAt: "2026-01-01T00:00:00Z" } };
  else if (p === "/api/archon/profile") data = { session: null };
  else if (p === "/api/governor/council-reports") data = { reports: [] };
  else if (p === "/api/smart/status") data = { overallScore: 0, activeModules: 0, totalModules: 0, systemStatus: "Local demo", modules: [] };
  else if (p === "/api/rewards/daily") {
    const user = getDemoUser();
    const reward = user.canClaimDaily ? 100 : 0;
    saveDemoUser({ ...user, balance: user.balance + reward, canClaimDaily: false });
    data = { coinsEarned: reward, newBalance: getDemoUser().balance, message: "Local demo coins only" };
  }
  else if (p === "/api/geo/detect") data = { countryCode: "INT" };
  else if (p === "/api/wallet/transactions") data = { transactions: [], balance: getDemoUser().balance };
  else if (p === "/api/gdna/status") data = { available: true, mode: "rules", agents: [{ id: "demo", name: "Demo guide", description: "Local sample replies, not an AI service" }], usage: { used: 0, limit: 100 }, platform: { demo: true } };
  else if (p === "/api/gdna/ask") data = { reply: "Standalone demo: explore games, rankings and sample profiles. This is a local canned reply, not live AI.", mode: "rules", agent: "demo", citations: [], suggestions: [], usage: { used: 0, limit: 100 }, auditId: "local-demo" };
  else if (p === "/api/gdna/memory" || p === "/api/gdna/evolution-log") data = { entries: [] };
  else if (p === "/api/call-push/config" || p === "/api/browser-push/config") data = { enabled: false, configured: false };
  else if (p === "/api/messages/unread-count") data = { count: 0, unreadCount: 0 };
  else if (p === "/api/messages/subscription") data = { hasActiveSubscription: false, active: false };
  else if (["/api/notifications", "/api/call-push/missed"].includes(p)) data = { notifications: [], calls: [], items: [] };
  else if (p === "/api/gs/domains") data = { domains: mockDomains };
  else if (p === "/api/gs/figures") data = { figures: mockFigures };
  else if (p === "/api/gs/news") data = { articles: mockTables.gs_articles };
  else if (p === "/api/gs/traditions") data = { traditions: mockTables.gs_traditions };
  else if (p === "/api/gs/ticker") data = { items: mockTables.gs_ticker };
  else if (["/api/social/v2/feed", "/api/social/v2/feed/following"].includes(p)) data = { posts: [], nextCursor: null };
  else if (p === "/api/stories/feed") data = { stories: [] };
  else if (p === "/api/pulse/events") data = { events: [] };
  else {
    // Never claim successful payments, uploads, recovery, or messages with a fake 200.
    status = 501;
    data = { error: "This feature needs a shared backend and is unavailable in the standalone demo.", code: "DEMO_UNAVAILABLE", demo: true, method };
  }
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "X-Arena-Demo": "true" } });
}
