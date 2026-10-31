// gdnaarena.app - VERSION: gdna-v2-public-marketplace-encyclopedia
// من 30 ثانية وما فوق بلا سقف - الأصل

const VERSION = "gdna-v2-public-marketplace-encyclopedia";

export const platform = {
  capabilityVersion: VERSION,
  globalDailyLimit: 20000,
  accountDailyLimit: 2000,
  maxQueryCharacters: 100000,
  maxCompletionTokens: 100000,
  model: "gpt-5-mini",
  clips: {
    minDuration: 30, // 30 ثانية وما فوق
    maxDuration: Infinity, // بلا سقف
    minSeconds: 30,
    maxSeconds: undefined, // بلا سقف
    policy: "from 30s unlimited - مفتوح بلا سقف"
  },
  uploadPolicy: {
    // ما كاينش maxClipBytes - مفتوح بلا سقف
    minClipSeconds: 30,
    maxClipBytes: undefined, // بلا سقف
    guarantees: "Unlimited - 30s to infinity - no cap - القصد محلول دون شرط يعيق"
  },
  navigation: "book-page-by-page",
  closeButton: "×",
  browseTools: ["zoom", "fullscreen", "toc", "bookmark", "search"],
  keepInSite: true,
  versions: "all-original-versions-restored"
}
