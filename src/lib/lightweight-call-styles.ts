const scope = '[data-global-call-root="true"]';

/** Split only top-level commas, retaining functional/attribute selectors. */
function selectors(text: string) {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "\\") { i++; continue; }
    if (quote) {
      if (char === quote) quote = "";
    } else if (char === '"' || char === "'") quote = char;
    else if (char === "(" || char === "[") depth++;
    else if (char === ")" || char === "]") depth--;
    else if (char === "," && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts;
}

function scopeRules(rules: CSSRuleList, insideSelector = false) {
  for (const rule of Array.from(rules)) {
    const isSelector = rule instanceof CSSStyleRule;
    if (isSelector && !insideSelector) {
      rule.selectorText = selectors(rule.selectorText).flatMap(selector => {
        // Root tokens and DS body defaults belong to the island, not the page.
        if (/^(?:html|body|:root|:host)(?=$|[\s,.:#\[])/.test(selector)) {
          return selector.replace(/^(?:html|body|:root|:host)/, scope);
        }
        const descendant = `${scope} ${selector}`;
        if (selector.startsWith("*")) return [descendant, scope + selector.slice(1)];
        if (/^[.#:\[]/.test(selector)) return [descendant, scope + selector];
        return [descendant];
      }).join(", ");
    }
    // Keep nested & selectors relative to their already-scoped parent. Media,
    // supports, and layer rules inherit the nearest selector's nesting state.
    if ("cssRules" in rule) {
      scopeRules((rule as CSSGroupingRule).cssRules, insideSelector || isSelector);
    }
  }
}

function serializeWithoutLayers(rules: CSSRuleList): string {
  return Array.from(rules).map(rule => {
    if (rule instanceof CSSStyleRule || !("cssRules" in rule)) {
      // Do not impose a document-global Tailwind layer ordering on the shell.
      return rule.cssText.startsWith("@layer") ? "" : rule.cssText;
    }
    const contents = serializeWithoutLayers((rule as CSSGroupingRule).cssRules);
    if (rule.cssText.startsWith("@layer")) return contents;
    return rule.cssText.slice(0, rule.cssText.indexOf("{") + 1) + contents + "}";
  }).join("\n");
}

/**
 * Parse the processed inline DS CSS with the browser, with application disabled,
 * then scope every selector before enabling it. No preflight/body selector ever
 * becomes active globally; no Shadow DOM focus/ARIA boundary is introduced.
 */
export function installLightweightCallStyles(css: string) {
  const style = document.createElement("style");
  style.media = "not all";
  style.dataset.globalCallStyles = "true";
  style.textContent = css;
  document.head.append(style);
  try {
    if (!style.sheet) throw new Error("Incoming call styles could not be initialized.");
    scopeRules(style.sheet.cssRules);
    // The vanilla shells use unlayered tag rules. Keep scoped DS rules unlayered
    // too so Clip's button/input rules cannot override call controls.
    style.textContent = serializeWithoutLayers(style.sheet.cssRules);
    style.media = "all";
  } catch (error) {
    style.remove();
    throw error;
  }
  return () => style.remove();
}