"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle, XCircle, Loader2, Copy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { webApi } from "@/lib/api";

type State =
  | { status: "loading" }
  | { status: "success"; key?: string | null }
  | { status: "error"; message: string };

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [state, setState] = useState<State>({ status: "loading" });
  const [copied, setCopied] = useState(false);
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    if (!token) {
      router.replace("/account/settings");
      return;
    }

    webApi
      .confirmVerifyEmail(token)
      .then((res) => setState({ status: "success", key: res.key }))
      .catch((err: unknown) => {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Failed to verify email. The link may have expired.";
        setState({ status: "error", message });
      });
  }, [token, router]);

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md border-border/50 bg-card/50">
        {state.status === "loading" && (
          <>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
              <CardTitle className="text-xl font-black tracking-tighter">Verifying…</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-sm text-muted-foreground">
                Confirming your email address.
              </p>
            </CardContent>
          </>
        )}

        {state.status === "success" && (
          <>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-400" />
              </div>
              <CardTitle className="text-xl font-black tracking-tighter">Email verified</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-center text-sm text-muted-foreground">
                Your email has been confirmed successfully.
              </p>

              {state.key && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                    <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-300">
                      Your API key has been created. Store it securely — it will not be shown again.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md bg-secondary/50 px-3 py-2 font-mono text-xs text-foreground break-all">
                      {state.key}
                    </code>
                    <Tooltip open={copied ? true : undefined}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(state.key!)}
                          aria-label="Copy API key"
                        >
                          {copied ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {copied ? "Copied!" : "Copy"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <Button asChild>
                  <Link href="/account">Go to Account</Link>
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {state.status === "error" && (
          <>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-xl font-black tracking-tighter">Verification failed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">{state.message}</p>
              <div className="flex justify-center">
                <Button variant="outline" asChild>
                  <Link href="/account/settings">Back to Settings</Link>
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
