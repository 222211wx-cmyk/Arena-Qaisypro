type Layer = { active: () => boolean; back: () => void | (() => void); priority: number };
const layers = new Map<symbol, Layer>();
let forwardSteps: { owner: symbol; restore: () => void }[] = [];

export function clearForwardSteps() { forwardSteps = []; }
export function registerNavigationLayer(layer: Layer) {
  const owner = Symbol();
  layers.set(owner, layer);
  return () => {
    layers.delete(owner);
    forwardSteps = forwardSteps.filter(step => step.owner !== owner);
  };
}
export function closeBackLayer() {
  const entry = [...layers.entries()].filter(([, layer]) => layer.active())
    .sort((a, b) => b[1].priority - a[1].priority)[0];
  if (!entry) return false;
  const restore = entry[1].back();
  if (restore) forwardSteps.push({ owner: entry[0], restore });
  return true;
}
export function navigateForward() {
  const step = forwardSteps.pop();
  if (step) step.restore();
  else history.forward();
}