/**
 * Lite operator-programme pages (Win-Win-Win 2.0). Loaded via DYNAMIC import from
 * the Lite entry only when `/lite/operators` or `/lite/data` is selected, so it
 * never grows the Lite core first-load budget.
 *
 * Vanilla DOM only. Renders exactly what the backend returns (see
 * artifacts/api-server/docs/operator-api.md) with honest empty / null /
 * measured / estimated / unverified labels. Never fabricates counts or savings.
 */
import { el, mount } from "./dom";
import { section } from "./components";
import { safeRead } from "./api";
import { getUser } from "./session";
import { href, type Route } from "./router";
import type { Strings } from "./i18n";
import { formatBytes, formatFraction } from "../lib/gdna-data-science";
import {
  telemetryConsent,
  setTelemetryConsent,
} from "../lib/operator-telemetry";

interface Ctx {
  s: Strings;
  navigate: (r: Route) => void;
}

/* ── Types mirrored from the API-owned operator contract ───────────── */
interface OperatorPack {
  id: string;
  name: string;
  priceMad: number;
  priceStatus: "unverified";
  dialCode: string;
  dialCodeVerified: boolean;
  officialUrl: string;
  partnershipStatus: "not_signed";
}
interface PacksResponse {
  packs: OperatorPack[];
  disclaimer: string;
  privacy: string;
}

interface ScienceSummary {
  month: string;
  measuredPayloadBytes: number;
  estimatedAvoidedBytes: number;
  observedRequestSuccessScore: number | null;
  sampleSize: number;
  comparisonSampleSize: number;
  measurementStatus: string;
  methodology: string;
}

/* ── Operators page ────────────────────────────────────────────────── */
export function operatorsPage(ctx: Ctx): HTMLElement {
  const root = el("div", { class: "l-stack" }, [
    el("div", { class: "l-h1", text: ctx.s.operators_title }),
    el("div", { class: "l-muted l-small", text: ctx.s.operators_intro }),
    el("div", { class: "l-card l-stack" }, [
      el("div", { class: "l-small", text: `\u25CF ${ctx.s.operators_direct_pay}` }),
      el("div", { class: "l-small l-muted", text: ctx.s.operators_no_commission }),
    ]),
  ]);

  root.appendChild(
    section<PacksResponse>({
      s: ctx.s,
      skeletonLines: 4,
      load: async (signal) => {
        const res = await safeRead<PacksResponse>("/api/operators/packs", {
          accountId: getUser()?.id ?? null,
          snapshotKey: "operator-packs",
          signal,
        });
        return { data: res.data, fromSnapshot: res.fromSnapshot };
      },
      isEmpty: (d) => !d.packs || d.packs.length === 0,
      emptyText: ctx.s.empty_operators,
      render: (resp) => {
        const box = el("div", { class: "l-stack" });
        for (const p of resp.packs) box.appendChild(operatorCard(p, ctx.s));
        // Server-provided disclaimer + privacy note, shown verbatim.
        if (resp.disclaimer) {
          box.appendChild(el("div", { class: "l-small l-muted", text: resp.disclaimer }));
        }
        if (resp.privacy) {
          box.appendChild(el("div", { class: "l-small l-muted", text: resp.privacy }));
        }
        return box;
      },
    }),
  );

  root.appendChild(
    el("button", {
      class: "l-btn l-btn-sm l-btn-ghost",
      text: ctx.s.operators_partner_cta,
      // Partner pitch lives in the React app at the exact root path.
      onClick: () => {
        const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
        location.href = `${base}/partners/operators`;
      },
    }),
  );
  return root;
}

// hint: Structural and logic conflict. Both design and behavior differ.
function operatorCard(p: OperatorPack, s: Strings): HTMLElement {
  // Contract invariants: priceStatus is always "unverified", partnershipStatus
  // "not_signed", and the dial code is DISPLAY-ONLY — never a tel: purchase
  // action (dialCodeVerified is false). We surface all of that honestly.
  const dialRow = el("div", { class: "l-stack" }, [
    el("div", { class: "l-small", text: p.dialCode }),
    el("div", { class: "l-small l-muted", text: s.operators_ussd_note }),
  ]);

  // Official operator URL for the citizen to confirm price/terms themselves.
  const officialLink = p.officialUrl
    ? el("a", {
        class: "l-btn l-btn-sm l-btn-ghost",
        href: p.officialUrl,
        target: "_blank",
        rel: "noopener noreferrer",
        text: s.operators_official_link,
      })
    : null;

  return el("div", { class: "l-card l-stack" }, [
    el("div", { class: "l-row l-spread l-row-wrap" }, [
      el("div", { class: "l-grow" }, [
        el("div", { class: "l-h2", text: p.name }),
        el("div", { class: "l-small l-muted", text: s.operators_direct_pay }),
      ]),
      el("span", { class: "l-badge l-badge-gold", text: `${p.priceMad} MAD` }),
    ]),
    // Prices are always unverified indications — labelled on every pack.
    el("div", { class: "l-banner l-banner-warn" }, [
      el("strong", { text: `${s.operators_unverified}. ` }),
      el("span", { text: s.operators_indicative }),
    ]),
    dialRow,
    officialLink,
  ]);
}
/* Incompatible legacy API implementation retained for merge provenance.
function operatorCard(p: OperatorPack, s: Strings): HTMLElement {
  // A tel: activation affordance is shown ONLY when the code is verified AND a
  // proof record exists. Otherwise the USSD is plain, explicitly-unverified text.
  const canActivate = p.verified && p.ussdVerified && Boolean(p.proofUrl);

  const ussdRow = canActivate
    ? el("a", {
        class: "l-btn l-btn-sm",
        href: `tel:${encodeURIComponent(p.ussd)}`,
        text: p.ussd,
      })
    : el("div", { class: "l-stack" }, [
        el("div", { class: "l-small", text: p.ussd }),
        el("div", { class: "l-small l-muted", text: s.operators_ussd_note }),
      ]);

  return el("div", { class: "l-card l-stack" }, [
    el("div", { class: "l-row l-spread l-row-wrap" }, [
      el("div", { class: "l-grow" }, [
        el("div", { class: "l-h2", text: p.operator }),
        el("div", { class: "l-small l-muted", text: p.notes }),
      ]),
      el("span", { class: "l-badge l-badge-gold", text: p.userPrice }),
    ]),
    // Every unverified pack is explicitly labelled.
    p.verified
      ? null
      : el("div", { class: "l-banner l-banner-warn" }, [
          el("strong", { text: `${s.operators_unverified}. ` }),
          el("span", { text: s.operators_indicative }),
        ]),
    p.dataAllowance
      ? el("div", { class: "l-row l-spread" }, [
          el("span", { class: "l-muted l-small", text: s.operators_data_allowance }),
          el("span", { class: "l-small", text: p.dataAllowance }),
        ])
      : null,
    ussdRow,
  ]);
}
*/

/* ── My data / savings page ───────────────────────────────────────── */
// hint: Structural and logic conflict. Both design and behavior differ.
export function dataPage(ctx: Ctx): HTMLElement {
  const user = getUser();
  const root = el("div", { class: "l-stack" }, [
    el("div", { class: "l-h1", text: ctx.s.data_title }),
    el("div", { class: "l-muted l-small", text: ctx.s.data_intro }),
    telemetryCard(ctx.s),
  ]);

  if (!user) {
    root.appendChild(
      el("div", { class: "l-card l-stack" }, [
        el("div", { text: ctx.s.loginRequired }),
        el("button", {
          class: "l-btn l-btn-primary l-btn-sm",
          text: ctx.s.login,
          onClick: () => ctx.navigate({ kind: "login" }),
        }),
      ]),
    );
    return root;
  }

  root.appendChild(
    section<ScienceSummary>({
      s: ctx.s,
      skeletonLines: 5,
      load: async (signal) => {
        const res = await safeRead<ScienceSummary>("/api/operators/science", {
          accountId: user.id,
          snapshotKey: "operator-science",
          signal,
        });
        return { data: res.data, fromSnapshot: res.fromSnapshot };
      },
      // Honest empty state — no seed or sample numbers.
      isEmpty: (d) => d.sampleSize === 0,
      emptyText: ctx.s.data_no_data,
      render: (summary) => scienceView(summary, ctx.s),
    }),
  );
  return root;
}
/* Incompatible legacy API implementation retained for merge provenance.
export function dataPage(ctx: Ctx): HTMLElement {
  const user = getUser();
  const root = el("div", { class: "l-stack" }, [
    el("div", { class: "l-h1", text: ctx.s.data_title }),
    el("div", { class: "l-muted l-small", text: ctx.s.data_intro }),
    telemetryCard(ctx.s),
  ]);

  if (!user) {
    root.appendChild(
      el("div", { class: "l-card l-stack" }, [
        el("div", { text: ctx.s.loginRequired }),
        el("button", {
          class: "l-btn l-btn-primary l-btn-sm",
          text: ctx.s.login,
          onClick: () => ctx.navigate({ kind: "login" }),
        }),
      ]),
    );
    return root;
  }

  root.appendChild(
    section<ScienceSummary>({
      s: ctx.s,
      skeletonLines: 5,
      load: async (signal) => {
        const res = await safeRead<ScienceSummary>("/api/operators/science", {
          accountId: user.id,
          snapshotKey: "operator-science",
          signal,
        });
        return { data: res.data, fromSnapshot: res.fromSnapshot };
      },
      // Honest empty state — no seed or sample numbers.
      isEmpty: (d) => d.empty || d.sampleSize === 0,
      emptyText: ctx.s.data_no_data,
      render: (summary) => scienceView(summary, ctx.s),
    }),
  );
  return root;
}
*/

// hint: Structural and logic conflict. Both design and behavior differ.
function scienceView(d: ScienceSummary, s: Strings): HTMLElement {
  const scoreText =
    d.observedRequestSuccessScore == null ? "—" : formatFraction(d.observedRequestSuccessScore);

  const row = (label: string, value: string, gold = false) =>
    el("div", { class: "l-row l-spread" }, [
      el("span", { class: "l-muted", text: label }),
      el("span", { class: gold ? "l-gold" : "", text: value }),
    ]);

  return el("div", { class: "l-stack" }, [
    // Everything on this page is client-reported, not independently verified.
    el("div", { class: "l-banner l-banner-warn", text: s.data_status_unverified }),

    // Request success score (successes + offline-cache / samples).
    el("div", { class: "l-card l-stack" }, [
      el("div", { class: "l-h2", text: s.data_score }),
      el("div", { class: "l-h1 l-gold", text: scoreText }),
      row(s.data_samples, String(d.sampleSize)),
    ]),

    // Measured payload + estimated avoided bytes.
    el("div", { class: "l-card l-stack" }, [
      el("div", { class: "l-row l-spread l-row-wrap" }, [
        el("div", { class: "l-h2 l-grow", text: s.data_saved }),
        el("span", { class: "l-badge", text: s.data_estimated }),
      ]),
      row(s.data_total, formatBytes(d.measuredPayloadBytes)),
      row(s.data_avoided, formatBytes(d.estimatedAvoidedBytes), true),
      row(s.data_comparison_samples, String(d.comparisonSampleSize)),
      row(s.data_month, d.month || "—"),
    ]),

    // Server-provided methodology, shown verbatim.
    el("div", { class: "l-card l-stack" }, [
      el("div", { class: "l-h2", text: s.data_method }),
      el("div", { class: "l-small l-muted", text: d.methodology }),
    ]),
  ]);
}
/* Incompatible legacy API implementation retained for merge provenance.
function scienceView(d: ScienceSummary, s: Strings): HTMLElement {
  const scoreText =
    d.score.value == null ? "—" : `${d.score.value} / ${d.score.max}`;

  const box = el("div", { class: "l-stack" }, [
    el("div", { class: "l-card l-stack" }, [
      el("div", { class: "l-row l-spread l-row-wrap" }, [
        el("div", { class: "l-h2 l-grow", text: s.data_score }),
        basisBadge(d.score.basis, s),
      ]),
      el("div", { class: "l-h1 l-gold", text: scoreText }),
      el("div", { class: "l-small l-muted", text: `${s.data_method}: ${d.score.method}` }),
    ]),
    el("div", { class: "l-card l-stack" }, [
      el("div", { class: "l-row l-spread l-row-wrap" }, [
        el("div", { class: "l-h2 l-grow", text: s.data_saved }),
        basisBadge(d.savings.basis, s),
      ]),
      el("div", { class: "l-row l-spread" }, [
        el("span", { class: "l-muted", text: s.data_saved }),
        el("span", { class: "l-gold", text: formatBytes(d.savings.bytesSaved) }),
      ]),
      el("div", { class: "l-row l-spread" }, [
        el("span", { class: "l-muted", text: s.data_total }),
        el("span", { text: formatBytes(d.savings.bytesTotal) }),
      ]),
      el("div", { class: "l-row l-spread" }, [
        el("span", { class: "l-muted", text: s.data_period }),
        el("span", { text: d.period ?? "—" }),
      ]),
      el("div", { class: "l-row l-spread" }, [
        el("span", { class: "l-muted", text: s.data_samples }),
        el("span", { text: String(d.sampleSize) }),
      ]),
      el("div", { class: "l-small l-muted", text: `${s.data_method}: ${d.savings.method}` }),
    ]),
  ]);

  if (d.clips.length > 0) {
    const clipBox = el("div", { class: "l-card l-stack" }, [
      el("div", { class: "l-h2", text: s.data_clips }),
    ]);
    for (const c of d.clips) {
      clipBox.appendChild(
        el("div", { class: "l-stack" }, [
          el("div", { class: "l-row l-spread l-row-wrap" }, [
            el("div", { class: "l-small l-grow", text: c.title }),
            basisBadge(c.savingBasis, s),
          ]),
          el("div", { class: "l-row l-spread" }, [
            el("span", { class: "l-small l-muted", text: s.data_original }),
            el("span", { class: "l-small", text: formatBytes(c.originalBytes) }),
          ]),
          // Only shown when a real derivative exists; never a speculative size.
          c.alternativeBytes != null
            ? el("div", { class: "l-row l-spread" }, [
                el("span", { class: "l-small l-muted", text: s.data_alternative }),
                el("span", { class: "l-small l-gold", text: formatBytes(c.alternativeBytes) }),
              ])
            : null,
        ]),
      );
    }
    box.appendChild(clipBox);
  }

  return box;
}
*/

function telemetryCard(s: Strings): HTMLElement {
  const input = el("input", { type: "checkbox" }) as HTMLInputElement;
  input.checked = telemetryConsent();
  input.addEventListener("change", () => setTelemetryConsent(input.checked));
  return el("div", { class: "l-card l-stack" }, [
    el("div", { class: "l-h2", text: s.telemetry_title }),
    el("label", { class: "l-switch" }, [input, el("span", { text: s.telemetry_consent })]),
    el("div", { class: "l-small l-muted", text: s.telemetry_hint }),
  ]);
}

/** Referral banner shown on any Lite page when `?ref=` attributed a source. */
export function referralBanner(s: Strings, ref: string): HTMLElement {
  return el("div", { class: "l-banner l-banner-warn l-stack" }, [
    el("div", {}, [el("strong", { text: `${s.referral_banner} ` }), el("span", { text: `(@${ref})` })]),
    el("div", { class: "l-small", text: s.referral_note }),
  ]);
}

export { href };
