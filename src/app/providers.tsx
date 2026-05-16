"use client";

import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { CurrencyProvider } from "@/lib/CurrencyContext";
import { NavigationProgress } from "@/components/NavigationProgress";
import { PostHogReplayPolicy } from "@/components/PostHogReplayPolicy";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <TooltipProvider>
          <NavigationProgress />
          <Suspense>
            <PostHogReplayPolicy />
          </Suspense>
          <Toaster />
          <Sonner />
          {children}
        </TooltipProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  );
}
