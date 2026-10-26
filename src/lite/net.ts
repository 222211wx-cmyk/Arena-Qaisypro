/**
 * Bridge to the infrastructure-owned network helper (src/lib/network-detect.ts).
 * Static re-exports — that module is the single source of truth for network state,
 * the `gdna.limitedData` preference, and download authorization. Lite adds nothing
 * on top; it only re-exports so page/component code has one import site.
 */
export type {
  NetworkState,
} from "../lib/network-detect";

export {
  getNetworkState,
  subscribeNetwork,
  setLimitedData,
  authorizeDownload,
} from "../lib/network-detect";
