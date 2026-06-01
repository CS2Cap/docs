"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { useSession } from "@/lib/api";

export function PostHogIdentify() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) return;

    if (session.email === "zaaroxyt@gmail.com") {
      posthog.opt_out_capturing();
    }

    posthog.identify(session.user_id, {
      email: session.email ?? undefined,
      display_name: session.display_name ?? undefined,
      tier: session.tier_info.code,
      created_at: session.created_at,
    });
  }, [session]);

  return null;
}
