const SPORT_LEGEND_IMAGE_FILES: Record<string, string> = {
  "Cristiano Ronaldo": "cristiano-ronaldo.jpg",
  "Lionel Messi": "lionel-messi.jpg",
  "LeBron James": "lebron-james.jpg",
  "Roger Federer": "roger-federer.jpg",
  "Serena Williams": "serena-williams.jpg",
  "Muhammad Ali": "muhammad-ali.jpg",
};

const appAsset = (path: string) =>
  `${(import.meta.env.BASE_URL ?? "/").replace(/\/$/, "")}/${path}`;

export function getLegendImageUrl(
  name: string,
  fallbackUrl?: string | null,
): string | null {
  const localFile = SPORT_LEGEND_IMAGE_FILES[name];
  return localFile
    ? appAsset(`assets/legends/${localFile}`)
    : fallbackUrl || null;
}