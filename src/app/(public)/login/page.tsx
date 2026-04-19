import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { API_BASE_URL } from "@/lib/api/config";
import { serverApi } from "@/lib/api/server";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{
    code?: string;
    error?: string;
    next?: string;
  }>;
};

const oauthProviders = [
  {
    id: "steam",
    name: "Steam",
    icon: (
      <Image src="/assets/steam.svg" alt="Steam" width={20} height={20} className="invert" />
    ),
  },
  {
    id: "google",
    name: "Google",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    ),
  },
  {
    id: "discord",
    name: "Discord",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#5865F2">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
  },
] as const;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { code, error, next } = await searchParams;

  if (code) {
    const params = new URLSearchParams({ code });
    if (next) {
      params.set("next", next);
    }
    redirect(`/auth/exchange?${params.toString()}`);
  }

  const session = await serverApi.getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-grid">
      <div className="mx-4 w-full max-w-sm">
        <div className="border-brutal bg-card p-8">
          <div className="mb-8 flex items-center gap-2">
            <Image src="/assets/logo.svg" alt="CS2Cap" width={24} height={24} />
            <span className="font-mono text-sm font-bold">
              CS2<span className="text-gradient-brand">Cap</span>
            </span>
          </div>

          <h1 className="mb-1 text-2xl font-black tracking-tighter">SIGN IN</h1>
          <p className="mb-8 font-mono text-xs text-muted-foreground">
            Access your dashboard, watchlist, and alerts.
          </p>

          {error ? (
            <div className="mb-6 border border-destructive/50 bg-destructive/10 px-3 py-2 font-mono text-[10px] text-destructive">
              OAuth sign-in could not be completed. Start the flow again.
            </div>
          ) : null}

          <div className="space-y-3">
            {oauthProviders.map((provider) => (
              <a
                key={provider.id}
                href={`${API_BASE_URL}/v1/web/auth/${provider.id}/login`}
                className="flex w-full items-center justify-center gap-3 border-brutal bg-secondary/50 px-4 py-3 font-mono text-sm font-bold tracking-wider brutalist-hover transition-colors hover:border-primary"
              >
                {provider.icon}
                <span>SIGN IN WITH {provider.name.toUpperCase()}</span>
              </a>
            ))}
          </div>

          <div className="mt-6 text-center">
            <span className="font-mono text-[10px] text-muted-foreground">
              By signing in, you agree to our{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms
              </Link>{" "}
              &amp;{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
