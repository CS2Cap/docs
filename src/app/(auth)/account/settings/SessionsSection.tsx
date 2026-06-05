"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRelativeTime } from "@/components/RelativeTime";
import {
  useSessions,
  useRevokeSessionMutation,
  useRevokeOtherSessionsMutation,
} from "@/lib/api";
import type { SessionInfo } from "@/lib/api/types";

function SessionRow({
  session,
  onRevoke,
  revoking,
}: {
  session: SessionInfo;
  onRevoke: (id: string) => void;
  revoking: boolean;
}) {
  const lastSeen = useRelativeTime(session.last_seen_at);
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{session.device_label}</span>
          {session.current && (
            <Badge variant="secondary" className="shrink-0">
              This device
            </Badge>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {session.ip_address ? `${session.ip_address} · ` : ""}
          {session.current ? "active now" : `last seen ${lastSeen ?? "—"}`}
        </div>
      </div>
      {!session.current && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-destructive hover:text-destructive"
          disabled={revoking}
          aria-label={revoking ? `Revoking ${session.device_label}` : `Revoke ${session.device_label}`}
          onClick={() => onRevoke(session.id)}
        >
          {revoking ? "Revoking…" : "Revoke"}
        </Button>
      )}
    </div>
  );
}

export function SessionsSection() {
  const { data, isLoading, isError, refetch } = useSessions();
  const revoke = useRevokeSessionMutation();
  const revokeOthers = useRevokeOtherSessionsMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sessions = data?.sessions ?? [];
  const otherCount = sessions.filter((s) => !s.current).length;

  function handleRevoke(id: string) {
    revoke.mutate(id, {
      onSuccess: () => toast.success("Signed out device"),
      onError: () => toast.error("Couldn't sign out that device. Please try again."),
    });
  }

  function handleRevokeOthers() {
    revokeOthers.mutate(undefined, {
      onSuccess: (res) =>
        toast.success(
          res.revoked === 1 ? "Signed out 1 device" : `Signed out ${res.revoked} devices`,
        ),
      onError: () => toast.error("Couldn't sign out the other devices. Please try again."),
      onSettled: () => setConfirmOpen(false),
    });
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="flex flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Active sessions
          </CardTitle>
          <CardDescription>Devices currently signed in to your account</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={otherCount === 0 || revokeOthers.isPending}
          onClick={() => setConfirmOpen(true)}
        >
          Sign out all other devices
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex items-center justify-between gap-4 py-2">
            <p className="text-sm text-muted-foreground">Couldn&apos;t load your sessions.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : sessions.length === 0 ? (
          <p className="py-3 text-xs text-muted-foreground">No active sessions found.</p>
        ) : (
          <div className="divide-y divide-border/50">
            {/* Single mutation instance: only the most-recently triggered row
                shows pending. Fine here — optimistic removal hides the row on click. */}
            {sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                onRevoke={handleRevoke}
                revoking={revoke.isPending && revoke.variables === session.id}
              />
            ))}
            {otherCount === 0 && (
              <p className="pt-3 text-xs text-muted-foreground">
                You&apos;re only signed in on this device.
              </p>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out all other devices?</DialogTitle>
            <DialogDescription>
              This signs out every session except the one you&apos;re using now. Those devices
              will need to sign in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={revokeOthers.isPending}
              onClick={handleRevokeOthers}
            >
              {revokeOthers.isPending ? "Signing out…" : "Sign out all others"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
