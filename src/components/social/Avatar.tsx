// ── Shared Avatar pill ────────────────────────────────────────────────────────
const PALETTE = ["hsl(var(--primary))", "#3b82f6", "#a78bfa", "#22c55e", "#ef4444", "#f59e0b", "#ec4899"];

export default function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const color = PALETTE[(name?.charCodeAt(0) ?? 0) % PALETTE.length];
  return (
    <div style={{
      width: size, height: size, minWidth: size,
      background: color, borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, fontWeight: 900, color: "#000",
      userSelect: "none", flexShrink: 0,
    }}>
      {(name?.[0] ?? "?").toUpperCase()}
    </div>
  );
}
