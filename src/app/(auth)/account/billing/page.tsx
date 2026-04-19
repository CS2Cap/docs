"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUpRight,
  CreditCard,
  Download,
  ExternalLink,
  RefreshCw,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBillingOverview, useBillingPlans, webApi } from "@/lib/api";
import { queryKeys } from "@/lib/api/hooks";
import { formatPriceMinor, planFeatureList } from "@/lib/api/view-models";
import type { PlanInfo } from "@/lib/api/types";

const QUARTERLY_DISCOUNT = 0.16;
function quarterlyTotalCents(monthlyCents: number) {
  return Math.round(monthlyCents * 3 * (1 - QUARTERLY_DISCOUNT));
}

type CycleChoice = "monthly" | "quarterly";
type PendingAction = {
  plan: PlanInfo;
  mode: "checkout" | "switch";
};

export default function AccountBillingPage() {
  const queryClient = useQueryClient();
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useBillingOverview();
  const { data: plans, isLoading: plansLoading } = useBillingPlans();
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoadingCode, setCheckoutLoadingCode] = useState<string | null>(null);
  const [changePlanLoadingCode, setChangePlanLoadingCode] = useState<string | null>(null);
  const [changePlanMessage, setChangePlanMessage] = useState<string | null>(null);
  const [changePlanError, setChangePlanError] = useState<string | null>(null);
  const [cancellingChange, setCancellingChange] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [cycleChoice, setCycleChoice] = useState<CycleChoice>("monthly");

  const currentPlan =
    plans?.plans.find((plan) => plan.code === overview?.current_plan.code) ?? null;
  const otherPlans =
    plans?.plans.filter(
      (plan) => plan.code !== overview?.current_plan.code && plan.billing_price_monthly_id,
    ) ?? [];

  async function openPortal() {
    setPortalLoading(true);
    try {
      const response = await webApi.getBillingPortal();
      window.location.href = response.portal_url;
    } finally {
      setPortalLoading(false);
    }
  }

  async function startCheckout(priceId: string, code: string) {
    setCheckoutLoadingCode(code);
    try {
      const response = await webApi.createCheckout({
        price_id: priceId,
        success_url: `${window.location.origin}/account/billing`,
        cancel_url: `${window.location.origin}/api-info#pricing`,
      });
      window.location.href = response.checkout_url;
    } finally {
      setCheckoutLoadingCode(null);
    }
  }

  async function handleChangePlan(priceId: string, code: string) {
    setChangePlanLoadingCode(code);
    setChangePlanMessage(null);
    setChangePlanError(null);
    try {
      const response = await webApi.changePlan(priceId);
      if (response.outcome === "updated") {
        setChangePlanMessage("Plan updated immediately.");
      } else {
        setChangePlanMessage("Change scheduled for your next billing cycle.");
      }
      await refetchOverview();
      queryClient.invalidateQueries({ queryKey: queryKeys.billingOverview });
      queryClient.invalidateQueries({ queryKey: queryKeys.session });
      queryClient.invalidateQueries({ queryKey: queryKeys.account });
    } catch (error: unknown) {
      setChangePlanError(
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Failed to change plan.",
      );
    } finally {
      setChangePlanLoadingCode(null);
    }
  }

  async function handleCancelPendingChange() {
    setCancellingChange(true);
    try {
      await webApi.cancelPendingChange();
      await refetchOverview();
      queryClient.invalidateQueries({ queryKey: queryKeys.billingOverview });
    } finally {
      setCancellingChange(false);
    }
  }

  if (overviewLoading || plansLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-4 h-8 w-48 animate-pulse rounded bg-secondary/50" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded bg-secondary/30" />
          <div className="h-64 animate-pulse rounded bg-secondary/30" />
        </div>
      </div>
    );
  }

  if (!overview) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <div className="font-mono text-xs tracking-widest text-primary mb-2">// BILLING</div>
        <h1 className="text-3xl font-black tracking-tighter">BILLING</h1>
      </div>

      {/* Pending change banner */}
      {overview.pending_change && (
        <Card className="mb-6 border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
              <div className="flex-1 text-sm">
                <span className="font-medium text-foreground">Scheduled change: </span>
                <span className="text-muted-foreground">
                  Switching to{" "}
                  <strong className="text-foreground">
                    {overview.pending_change.target_display_name}
                  </strong>{" "}
                  on{" "}
                  {new Date(overview.pending_change.effective_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelPendingChange}
                disabled={cancellingChange}
                className="shrink-0"
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                {cancellingChange ? "Cancelling…" : "Cancel Change"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current plan */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Current Plan</CardTitle>
                <CardDescription>Plan and renewal</CardDescription>
              </div>
              <Badge
                variant="outline"
                className={
                  overview.has_subscription
                    ? "border-green-500/20 bg-green-500/10 text-green-400"
                    : "border-border/50"
                }
              >
                {overview.has_subscription ? "Subscribed" : "No active subscription"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {formatPriceMinor(
                    overview.current_plan.monthly_price_cents,
                    overview.current_plan.currency,
                  )}
                </span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {overview.current_plan.display_name}
                {overview.renews_at
                  ? ` · Renews ${new Date(overview.renews_at).toLocaleDateString("en-US")}`
                  : overview.cancels_at
                    ? ` · Cancels ${new Date(overview.cancels_at).toLocaleDateString("en-US")}`
                    : ""}
              </p>
            </div>

            <ul className="space-y-2 text-sm text-muted-foreground">
              {planFeatureList(currentPlan ?? overview.current_plan).map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-3">
              {overview.portal_available ? (
                <Button variant="outline" onClick={openPortal} disabled={portalLoading}>
                  {portalLoading ? "Opening..." : "Manage in Portal"}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <Link href="/api-info#pricing">Compare Plans</Link>
                </Button>
              )}
            </div>

            {/* Plan change feedback */}
            {changePlanMessage && (
              <p className="text-sm text-muted-foreground">{changePlanMessage}</p>
            )}
            {changePlanError && (
              <p className="text-sm text-destructive">{changePlanError}</p>
            )}

            {/* Available plan switches */}
            {otherPlans.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Switch plan
                </p>
                {otherPlans.map((plan) => (
                  <div
                    key={plan.code}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/10 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{plan.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPriceMinor(plan.monthly_price_cents, plan.currency)}/month
                      </p>
                    </div>
                    {overview.has_subscription && plan.billing_price_monthly_id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCycleChoice("monthly");
                          setPendingAction({ plan, mode: "switch" });
                        }}
                        disabled={changePlanLoadingCode === plan.code}
                      >
                        {changePlanLoadingCode === plan.code ? "Switching…" : `Switch`}
                        <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    ) : plan.billing_price_monthly_id ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setCycleChoice("monthly");
                          setPendingAction({ plan, mode: "checkout" });
                        }}
                        disabled={checkoutLoadingCode === plan.code}
                      >
                        {checkoutLoadingCode === plan.code ? "Redirecting…" : `Choose ${plan.display_name}`}
                        <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment method */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Default Payment Method</CardTitle>
                <CardDescription>Saved card on file</CardDescription>
              </div>
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {overview.default_payment_method ? (
              <div className="rounded-lg border border-border/30 bg-secondary/30 p-4">
                <p className="font-medium text-foreground">
                  {overview.default_payment_method.brand?.toUpperCase() ?? "Card"} ending in{" "}
                  {overview.default_payment_method.last4 ?? "----"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Expires {overview.default_payment_method.exp_month ?? "--"}/
                  {overview.default_payment_method.exp_year ?? "----"}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border/30 bg-secondary/20 p-4 text-sm text-muted-foreground">
                No payment method on file.
              </div>
            )}

            <div className="mt-4">
              <Button
                variant="outline"
                onClick={openPortal}
                disabled={!overview.portal_available || portalLoading}
              >
                {portalLoading ? "Opening..." : "Update Billing Details"}
                <RefreshCw className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing history */}
      <Card className="mt-6 border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Billing History</CardTitle>
          <CardDescription>Recent invoices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview.invoices.length > 0 ? (
            overview.invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-col gap-3 rounded-lg border border-border/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">{invoice.id}</p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.created_at
                      ? new Date(invoice.created_at).toLocaleDateString("en-US")
                      : "Unknown issue date"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium text-foreground">
                      {formatPriceMinor(invoice.amount_cents, invoice.currency)}
                    </p>
                    <Badge variant="outline">{invoice.status ?? "unknown"}</Badge>
                  </div>
                  {(invoice.invoice_pdf_url || invoice.hosted_invoice_url) && (
                    <Button variant="ghost" size="icon" asChild>
                      <a
                        href={invoice.invoice_pdf_url || invoice.hosted_invoice_url || "#"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          )}
        </CardContent>
      </Card>

      <SubscriptionCycleDialog
        action={pendingAction}
        cycle={cycleChoice}
        onCycleChange={setCycleChoice}
        onClose={() => setPendingAction(null)}
        onConfirm={async () => {
          if (!pendingAction) return;
          const { plan, mode } = pendingAction;
          const priceId =
            cycleChoice === "quarterly" && plan.billing_price_quarterly_id
              ? plan.billing_price_quarterly_id
              : plan.billing_price_monthly_id;
          if (!priceId) return;
          setPendingAction(null);
          if (mode === "checkout") {
            await startCheckout(priceId, plan.code);
          } else {
            await handleChangePlan(priceId, plan.code);
          }
        }}
        loading={
          (pendingAction?.mode === "checkout" && checkoutLoadingCode === pendingAction.plan.code) ||
          (pendingAction?.mode === "switch" && changePlanLoadingCode === pendingAction.plan.code)
        }
      />
    </div>
  );
}

function SubscriptionCycleDialog({
  action,
  cycle,
  onCycleChange,
  onClose,
  onConfirm,
  loading,
}: {
  action: PendingAction | null;
  cycle: CycleChoice;
  onCycleChange: (c: CycleChoice) => void;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const plan = action?.plan ?? null;
  const hasQuarterly = !!plan?.billing_price_quarterly_id;
  const monthlyCents = plan?.monthly_price_cents ?? 0;
  const currency = plan?.currency ?? "USD";
  const quarterlyTotal = quarterlyTotalCents(monthlyCents);
  const quarterlyPerMonth = Math.round(quarterlyTotal / 3);

  return (
    <Dialog open={!!action} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose your billing cycle</DialogTitle>
          <DialogDescription>
            {plan ? `Select how long you want to subscribe to ${plan.display_name}.` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <button
            type="button"
            onClick={() => onCycleChange("monthly")}
            className={`w-full rounded-md border-2 p-4 text-left transition-colors ${
              cycle === "monthly"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">1 month</p>
                <p className="text-xs text-muted-foreground">Billed monthly</p>
              </div>
              <p className="font-mono text-sm font-bold text-foreground">
                {formatPriceMinor(monthlyCents, currency)}/mo
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => hasQuarterly && onCycleChange("quarterly")}
            disabled={!hasQuarterly}
            className={`w-full rounded-md border-2 p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              cycle === "quarterly"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">3 months</p>
                  <span className="bg-success/20 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-success">
                    -16%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {hasQuarterly
                    ? `${formatPriceMinor(quarterlyTotal, currency)} billed every 3 months`
                    : "Not available for this plan"}
                </p>
              </div>
              <p className="font-mono text-sm font-bold text-foreground">
                {formatPriceMinor(quarterlyPerMonth, currency)}/mo
              </p>
            </div>
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading || !plan}>
            {loading
              ? "Redirecting…"
              : action?.mode === "checkout"
                ? "Continue to checkout"
                : "Confirm switch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
