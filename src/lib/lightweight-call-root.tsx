import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@workspace/gdna-ds/components/ui/toaster";
import { TooltipProvider } from "@workspace/gdna-ds/components/ui/tooltip";
import { PortalContainerProvider } from "@workspace/gdna-ds/lib/portal-container";
import { AuthProvider } from "@/contexts/AuthContext";
import { LangProvider } from "@/contexts/LangContext";
import { ConnectivityProvider } from "@/contexts/ConnectivityContext";
import { GlobalCallBoundary } from "@/contexts/GlobalCallBoundary";
import callStyles from "./lightweight-call-root.css?inline";
import { installLightweightCallStyles } from "./lightweight-call-styles";

/** Supplementary React island; the vanilla page never waits for this root. */
export function mountLightweightCallRoot(host: HTMLElement) {
  const removeStyles = installLightweightCallStyles(callStyles);
  host.classList.add("font-sans", "antialiased", "text-foreground");
  const root = createRoot(host);
  const queryClient = new QueryClient();
  root.render(
    <PortalContainerProvider container={host}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LangProvider manageDocument={false}>
            <ConnectivityProvider>
              <AuthProvider>
                <GlobalCallBoundary>
                  <Toaster />
                </GlobalCallBoundary>
              </AuthProvider>
            </ConnectivityProvider>
          </LangProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </PortalContainerProvider>,
  );
  return {
    dispose() {
      root.unmount();
      queryClient.clear();
      removeStyles();
    },
  };
}