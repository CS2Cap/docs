import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { API_BASE_URL } from "@/lib/api/config";
import { serverApi } from "@/lib/api/server";
import { LoginProviderButtons } from "@/components/LoginProviderButtons";

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
          <p className="mb-8 font-mono text-sm leading-6 text-muted-foreground">
            Access your dashboard, watchlist, and alerts.
          </p>

          {error ? (
            <div className="mb-6 border border-destructive/50 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
              OAuth sign-in could not be completed. Start the flow again.
            </div>
          ) : null}

          <LoginProviderButtons apiBaseUrl={API_BASE_URL} />

          <div className="mt-6 text-center">
            <span className="font-mono text-xs text-muted-foreground">
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
