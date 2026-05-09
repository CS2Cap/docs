"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { useSession } from "@/lib/api";

const DISMISS_KEY = "email-verification-banner-dismissed";

export function EmailVerificationBanner() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!session || dismissed) return null;

  const needsEmail = !session.email;
  const needsVerification = session.email && !session.email_verified_at;

  if (!needsEmail && !needsVerification) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="relative flex items-center gap-3 border border-yellow-500/30 bg-yellow-500/[0.12] px-3 py-2.5 text-xs">
      <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-400" strokeWidth={1.5} />
      <span className="font-mono text-[11px] font-bold text-yellow-400">
        {needsEmail ? "EMAIL REQUIRED" : "EMAIL UNVERIFIED"}
      </span>
      <span className="font-mono text-[10px] text-yellow-400/80">
        {needsEmail
          ? "Set an email address to generate an API key."
          : "Verify your email to unlock API key generation."}
      </span>
      <Link
        href="/account/settings"
        className="ml-1 font-mono text-[10px] font-bold tracking-wider text-yellow-400 underline underline-offset-2 hover:text-yellow-300 transition-colors"
      >
        SETTINGS
      </Link>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="ml-auto text-yellow-400/60 hover:text-yellow-300 transition-colors"
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
