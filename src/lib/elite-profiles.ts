// ── GDNA Arena — Elite (VIP) profiles ────────────────────────────────────────
// Editorial fan hub. Everything here is honest by design:
//  • No invented follower counts or engagement numbers.
//  • Awards for 2026 are framed as "Trending 2026" editorial selections, never
//    stated as factual/verified wins.
//  • Shop links point ONLY to real, official external stores where one is
//    established, otherwise to the in-app GDNA shop (clearly labelled).
//  • The AI Fan Chat is an independent GDNA fan guide, not the real person and
//    not affiliated with them.
//
// Portraits use reliable Wikimedia Commons image URLs (Special:FilePath) or an
// existing in-app asset, never arbitrary stock imagery. If an image fails to
// load, the UI falls back to initials.

export interface EliteStat {
  /** Short, verifiable/uncontroversial fact label. */
  label: string;
  /** Honest value — no invented follower counts. */
  value: string;
}

export interface EliteShop {
  label: string;
  href: string;
  /** true when this points at the in-app GDNA shop rather than an external store. */
  internal: boolean;
}

export interface EliteSocial {
  /** "instagram" | "x" | "youtube" | "facebook" | "tiktok" | "website" */
  kind: "instagram" | "x" | "youtube" | "facebook" | "tiktok" | "website";
  label: string;
  href: string;
}

export interface EliteProfile {
  slug: string;
  name: string;
  /** Domain / one-line role. */
  role: string;
  nationality: string;
  /** Short editorial category shown in the grid tag. */
  category: string;
  /** Long-form honest bio paragraphs. */
  bio: string[];
  /** Trending 2026 editorial note (never framed as a factual award). */
  trending2026: string;
  stats: EliteStat[];
  shop: EliteShop;
  social: EliteSocial[];
  /** Portrait URL (Wikimedia Commons or in-app asset). */
  portrait: string;
  /** Gold "Trending #1" featured editorial badge. */
  featured?: boolean;
  /** Editorial rating out of 10 (displayed as "N/10"). */
  rating?: number;
  /** Special editorial status — "GuestOfHonor" gets the dedicated gold VIP page. */
  status?: "GuestOfHonor";
  isFeatured?: boolean;
  highlight?: boolean;
}

export const isGuestOfHonor = (p: EliteProfile) => p.status === "GuestOfHonor";

const wiki = (file: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=640`;

// In-app GDNA shop, used when no official personal store is established.
const GDNA_SHOP: EliteShop = { label: "GDNA Shop", href: "/shop", internal: true };

export const ELITE_PROFILES: EliteProfile[] = [
  {
    slug: "lamine-yamal",
    name: "Lamine Yamal",
    role: "Footballer — Winger",
    nationality: "Spain",
    category: "Football",
    portrait: wiki("Lamine_Yamal_France_v_Spain_7.24.26-142.jpg"),
    bio: [
      "Lamine Yamal is a Spanish professional footballer who plays as a winger for FC Barcelona and the Spain national team. Born in 2007, he emerged from Barcelona's La Masia academy and became one of the most talked-about young players in world football.",
      "Known for his dribbling, close control and creativity on the right flank, he broke a series of youngest-player records for club and country during his breakthrough seasons.",
    ],
    trending2026:
      "Trending 2026 — GDNA Arena editorial spotlight on a rising talent to watch. An editorial selection, not a factual award.",
    stats: [
      { label: "Position", value: "Winger" },
      { label: "Club", value: "FC Barcelona" },
      { label: "Nation", value: "Spain" },
      { label: "Born", value: "2007" },
    ],
    shop: GDNA_SHOP,
    social: [
      { kind: "instagram", label: "Instagram (official)", href: "https://www.instagram.com/lamineyamal/" },
    ],
  },
  {
    slug: "adele",
    name: "Adele",
    role: "Singer-Songwriter",
    nationality: "United Kingdom",
    category: "Music",
    rating: 10,
    status: "GuestOfHonor",
    isFeatured: true,
    highlight: true,
    portrait: wiki("Adele_2016.jpg"),
    bio: [
      "Adele Laurie Blue Adkins is an English singer-songwriter, one of the best-selling music artists of her generation, known for the albums 19, 21, 25 and 30.",
      "Her contralto voice and stripped-back, emotionally direct songwriting have defined a run of globally successful records and sold-out residencies.",
    ],
    trending2026:
      "Trending 2026 — GDNA Arena editorial spotlight for enduring cultural impact. An editorial selection, not a verified award.",
    stats: [
      { label: "Field", value: "Music" },
      { label: "Origin", value: "London, UK" },
      { label: "Known for", value: "21 · 25 · 30" },
    ],
    shop: { label: "Official Store (adele.com)", href: "https://shop.adele.com/", internal: false },
    social: [
      { kind: "instagram", label: "Instagram (official)", href: "https://www.instagram.com/adele/" },
      { kind: "website", label: "adele.com", href: "https://www.adele.com/" },
    ],
  },
  {
    slug: "badr-hari",
    name: "Badr Hari",
    role: "Kickboxer — Heavyweight",
    nationality: "Morocco / Netherlands",
    category: "Combat Sports",
    portrait: wiki("Badr-hari-2017-2.jpg"),
    bio: [
      "Badr Hari is a Moroccan-Dutch super heavyweight kickboxer, one of the most recognisable figures in the sport's heavyweight division.",
      "Known for his knockout power and high-profile bouts on major promotions, he built a large international following throughout his career.",
    ],
    trending2026:
      "Trending 2026 — GDNA Arena editorial spotlight in combat sports. An editorial selection, not a factual title claim.",
    stats: [
      { label: "Discipline", value: "Kickboxing" },
      { label: "Division", value: "Heavyweight" },
      { label: "Heritage", value: "Morocco / NL" },
    ],
    shop: GDNA_SHOP,
    social: [
      { kind: "instagram", label: "Instagram (official)", href: "https://www.instagram.com/badrhariofficial/" },
    ],
  },
  {
    slug: "shahrukh-khan",
    name: "Shahrukh Khan",
    role: "Actor & Producer",
    nationality: "India",
    category: "Cinema",
    portrait: wiki("Shah Rukh Khan graces the launch of the new Santro (cropped).jpg"),
    bio: [
      "Shah Rukh Khan is an Indian actor and film producer working primarily in Hindi cinema, often referred to as one of the most successful film stars in the world.",
      "Across a decades-long career he has starred in a long list of landmark films and co-founded the production company Red Chillies Entertainment.",
    ],
    trending2026:
      "Trending 2026 — GDNA Arena editorial spotlight for global cinema. An editorial selection, not a verified award.",
    stats: [
      { label: "Field", value: "Cinema" },
      { label: "Industry", value: "Hindi film" },
      { label: "Origin", value: "India" },
    ],
    shop: GDNA_SHOP,
    social: [
      { kind: "instagram", label: "Instagram (official)", href: "https://www.instagram.com/iamsrk/" },
      { kind: "x", label: "X / Twitter (official)", href: "https://twitter.com/iamsrk" },
    ],
  },
  {
    slug: "cristiano-ronaldo",
    name: "Cristiano Ronaldo",
    role: "Footballer — Forward",
    nationality: "Portugal",
    category: "Football",
    portrait: wiki("Cristiano Ronaldo playing for Al Nassr FC against Persepolis, September 2023 (cropped).jpg"),
    bio: [
      "Cristiano Ronaldo is a Portuguese professional footballer widely regarded as one of the greatest players of all time, having played for clubs including Sporting CP, Manchester United, Real Madrid, Juventus and Al Nassr.",
      "A prolific goalscorer and multiple-time major individual award winner, he is also the captain of the Portugal national team.",
    ],
    trending2026:
      "Trending 2026 — GDNA Arena editorial spotlight for sustained global reach. An editorial selection, not a new factual award.",
    stats: [
      { label: "Position", value: "Forward" },
      { label: "Club", value: "Al Nassr" },
      { label: "Nation", value: "Portugal" },
    ],
    shop: { label: "CR7 Official Store", href: "https://www.cr7.com/", internal: false },
    social: [
      { kind: "instagram", label: "Instagram (official)", href: "https://www.instagram.com/cristiano/" },
      { kind: "website", label: "cr7.com", href: "https://www.cr7.com/" },
    ],
  },
  {
    slug: "yassine-bounou",
    name: "Yassine Bounou (Bounou)",
    role: "Goalkeeper",
    nationality: "Morocco",
    category: "Football",
    portrait: wiki("Yassine_Bounou_Brazil_V_Morocco_13_June_2026-169.jpg"),
    bio: [
      "Yassine Bounou, commonly known as Bono, is a Moroccan professional footballer who plays as a goalkeeper for Al Hilal and the Morocco national team.",
      "He gained wide recognition for his performances in major club and international competitions, including Morocco's run at the 2022 FIFA World Cup.",
    ],
    trending2026:
      "Trending 2026 — GDNA Arena editorial spotlight for goalkeeping. An editorial selection, not a factual title claim.",
    stats: [
      { label: "Position", value: "Goalkeeper" },
      { label: "Club", value: "Al Hilal" },
      { label: "Nation", value: "Morocco" },
    ],
    shop: GDNA_SHOP,
    social: [
      { kind: "instagram", label: "Instagram (official)", href: "https://www.instagram.com/y.bounou/" },
    ],
  },
  {
    slug: "hakim-ziyech",
    name: "Hakim Ziyech",
    role: "Footballer — Attacking Midfielder",
    nationality: "Morocco",
    category: "Football",
    portrait: wiki("Hakim_Ziyech_2021.jpg"),
    bio: [
      "Hakim Ziyech is a Moroccan professional footballer who plays as an attacking midfielder or winger, known for his left-footed technique, set pieces and playmaking.",
      "He has represented clubs including Ajax and Chelsea and is a regular for the Morocco national team.",
    ],
    trending2026:
      "Trending 2026 — GDNA Arena editorial spotlight for creative playmaking. An editorial selection, not a verified award.",
    stats: [
      { label: "Position", value: "Att. Mid / Wing" },
      { label: "Nation", value: "Morocco" },
      { label: "Foot", value: "Left" },
    ],
    shop: GDNA_SHOP,
    social: [
      { kind: "instagram", label: "Instagram (official)", href: "https://www.instagram.com/hakimziyech/" },
    ],
  },
  {
    slug: "brad-pitt",
    name: "Brad Pitt",
    role: "Actor & Producer",
    nationality: "United States",
    category: "Cinema",
    portrait: wiki("Brad Pitt 2019 by Glenn Francis.jpg"),
    bio: [
      "William Bradley Pitt is an American actor and film producer, recognised with multiple major industry awards across a long career in film.",
      "He is also a producer through his company Plan B Entertainment, which has backed a range of acclaimed films.",
    ],
    trending2026:
      "Trending 2026 — GDNA Arena editorial spotlight for cinema. An editorial selection, not a new factual award.",
    stats: [
      { label: "Field", value: "Cinema" },
      { label: "Also", value: "Producer" },
      { label: "Origin", value: "USA" },
    ],
    shop: GDNA_SHOP,
    social: [
      { kind: "website", label: "Plan B Entertainment", href: "https://www.planbent.com/" },
    ],
  },
  {
    slug: "majid-al-mohandis",
    name: "Majid Al Mohandis",
    role: "Singer & Composer",
    nationality: "Iraq / Saudi Arabia",
    category: "Music",
    portrait: wiki("Majid al-Muhandis, Tenadeek - Arab Idol, Feb 18, 2017 (02).png"),
    bio: [
      "Majid Al Mohandis is an Iraqi–Saudi singer and composer, one of the prominent voices in contemporary Arabic music, often referred to by fans as \"Mohandis Al Ughniya\" (the engineer of song).",
      "He is known across the Gulf and wider Arab world for a large catalogue of songs and live performances.",
    ],
    trending2026:
      "Trending 2026 — GDNA Arena editorial spotlight for Arabic music. An editorial selection, not a verified award.",
    stats: [
      { label: "Field", value: "Music" },
      { label: "Style", value: "Arabic / Gulf" },
      { label: "Heritage", value: "Iraq / KSA" },
    ],
    shop: GDNA_SHOP,
    social: [
      { kind: "instagram", label: "Instagram (official)", href: "https://www.instagram.com/majidalmohandes/" },
    ],
  },
  {
    slug: "sarah-burton",
    name: "Sarah Burton",
    role: "Fashion Designer",
    nationality: "United Kingdom",
    category: "Fashion",
    // No free-licensed portrait of Sarah Burton exists on Wikimedia Commons
    // (only her designs). We deliberately show the initials fallback rather
    // than an invented filename or an unrelated/arbitrary stock image.
    portrait: "",
    bio: [
      "Sarah Burton is a British fashion designer. She was formerly the creative director of Alexander McQueen, where she led the house for over a decade following her long tenure at the label.",
      "She is now the creative director of Givenchy, continuing a career defined by craftsmanship, tailoring and high-fashion couture.",
    ],
    trending2026:
      "Trending 2026 — GDNA Arena editorial spotlight for fashion design. An editorial selection, not a verified award.",
    stats: [
      { label: "Field", value: "Fashion" },
      { label: "Now", value: "Givenchy" },
      { label: "Formerly", value: "Alexander McQueen" },
    ],
    shop: { label: "Givenchy Official Store", href: "https://www.givenchy.com/", internal: false },
    social: [
      { kind: "website", label: "givenchy.com", href: "https://www.givenchy.com/" },
    ],
  },
  {
    slug: "yannick-alleno",
    name: "Yannick Alléno",
    role: "Chef",
    nationality: "France",
    category: "Gastronomy",
    portrait: wiki("202306-PortraitAlleno@SimonDetraz-3 (cropped).jpg"),
    bio: [
      "Yannick Alléno is a French chef known for his work in fine dining and for his research into sauces and modern French cuisine.",
      "His restaurant portfolio includes the Pavyllon restaurants in Paris and London, and Monsieur Dior — venues that are central highlights of his contemporary work.",
    ],
    trending2026:
      "Trending 2026 — GDNA Arena editorial spotlight for gastronomy. An editorial selection, not a factual award or star-count claim.",
    stats: [
      { label: "Field", value: "Gastronomy" },
      { label: "Highlights", value: "Pavyllon Paris / London" },
      { label: "Also", value: "Monsieur Dior" },
    ],
    shop: GDNA_SHOP,
    social: [
      { kind: "website", label: "yannick-alleno.com", href: "https://www.yannick-alleno.com/" },
    ],
  },
];

// Homepage carousel order (exactly 11): Adele (Guest of Honor) first.
export const ELITE_CAROUSEL_ORDER: string[] = [
  "adele",
  "lamine-yamal",
  "badr-hari",
  "shahrukh-khan",
  "cristiano-ronaldo",
  "yassine-bounou",
  "hakim-ziyech",
  "brad-pitt",
  "majid-al-mohandis",
  "sarah-burton",
  "yannick-alleno",
];

export function getEliteProfile(slug: string): EliteProfile | undefined {
  return ELITE_PROFILES.find((p) => p.slug === slug);
}

/** Profiles in the exact homepage carousel order. */
export function getEliteCarousel(): EliteProfile[] {
  return ELITE_CAROUSEL_ORDER.map((s) => getEliteProfile(s)!).filter(Boolean);
}
