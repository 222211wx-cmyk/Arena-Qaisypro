import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { coreCopy } from "@/i18n/core-auth-copy";

export default function NotFound() {
  const { lang } = useLang();
  const copy = coreCopy(lang);
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">404 {copy.notFoundTitle.replace("404 ", "")}</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {copy.notFoundText}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
