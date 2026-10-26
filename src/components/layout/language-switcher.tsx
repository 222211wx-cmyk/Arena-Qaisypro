import { Button } from "@workspace/gdna-ds/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuTrigger,
} from "@workspace/gdna-ds/components/ui/dropdown-menu";
import { useLang, LANGS, type Lang } from "@/contexts/LangContext";

/** The same language control in Arena navigation and the standalone messenger. */
export function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="shrink-0"
          aria-label={lang === "ar" ? "اللغة" : "Language"}>
          {lang === "ar" ? "SA" : lang.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={lang} onValueChange={value => setLang(value as Lang)}>
          {LANGS.map(language => (
            <DropdownMenuRadioItem key={language.code} value={language.code}>
              {language.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}