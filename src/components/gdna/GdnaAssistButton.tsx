import { Link } from "wouter";
import { Sparkles } from "lucide-react";
import { buttonVariants } from "@workspace/gdna-ds/components/ui/button";
import { cn } from "@workspace/gdna-ds/lib/utils";
import { useLang } from "@/contexts/LangContext";
import { gdnaCopy } from "@/lib/gdna-copy";
import { gdnaAssistHref, type GdnaAssistLink } from "@/lib/gdna-assist";

/**
 * Lightweight explicit assistance entrypoint. Renders a Link to the /chat GDNA
 * control surface, carrying a section and an optional review-first draft prompt.
 *
 * SAFETY: `prompt` must contain only text the citizen has explicitly chosen to
 * share. Never pass decrypted messages or arbitrary private profile data — the
 * draft is reviewed and edited by the citizen before it is ever sent.
 */
export default function GdnaAssistButton({
  section,
  prompt,
  label,
  variant = "outline",
  size = "sm",
  className,
}: GdnaAssistLink & {
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}) {
  const { lang } = useLang();
  const c = gdnaCopy(lang);

  return (
    <Link
      href={gdnaAssistHref({ section, prompt })}
      className={cn(buttonVariants({ variant, size }), "gap-1.5", className)}
      data-testid={`gdna-assist-${section}`}
    >
      <Sparkles className="size-4" />
      {label ?? c.assist}
    </Link>
  );
}
