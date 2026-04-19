"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle,
  Mail,
  ShieldCheck,
  Trash2,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAccountPreferences, useSession, webApi } from "@/lib/api";

const currencyOptions = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "CNY", label: "CNY (¥)" },
];

const timezoneOptions = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Berlin", label: "Berlin" },
];

function providerLabel(provider: string) {
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isLoading: sessionLoading, refetch: refetchSession } = useSession();
  const {
    data: preferences,
    isLoading: preferencesLoading,
    refetch: refetchPreferences,
  } = useAccountPreferences();

  // Preferences state
  const [preferredCurrency, setPreferredCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("UTC");
  const [alertEmailsEnabled, setAlertEmailsEnabled] = useState(true);
  const [productUpdateEmailsEnabled, setProductUpdateEmailsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Email section state
  const [emailInput, setEmailInput] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showChangeEmailForm, setShowChangeEmailForm] = useState(false);

  // Verify email state
  const [sendingVerify, setSendingVerify] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Unlink provider state
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [pendingUnlink, setPendingUnlink] = useState<string | null>(null);

  // Delete account state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const prefInitialized = useRef(false);

  useEffect(() => {
    if (!preferences || prefInitialized.current) return;
    prefInitialized.current = true;
    setPreferredCurrency(preferences.preferred_currency);
    setTimezone(preferences.timezone);
    setAlertEmailsEnabled(preferences.alert_emails_enabled);
    setProductUpdateEmailsEnabled(preferences.product_update_emails_enabled);
  }, [preferences]);

  if (sessionLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-4 h-8 w-48 animate-pulse rounded bg-secondary/50" />
        <div className="h-80 animate-pulse rounded bg-secondary/30" />
      </div>
    );
  }

  if (!session) return null;

  const displayName = session.display_name ?? session.email ?? "Account";
  const memberSince = new Date(session.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const linkedProviders = session.linked_providers;
  const hasChanges = preferences
    ? preferredCurrency !== preferences.preferred_currency ||
      timezone !== preferences.timezone ||
      alertEmailsEnabled !== preferences.alert_emails_enabled ||
      productUpdateEmailsEnabled !== preferences.product_update_emails_enabled
    : false;

  async function handleSavePreferences() {
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      await webApi.updateAccountPreferences({
        preferred_currency: preferredCurrency,
        timezone,
        alert_emails_enabled: alertEmailsEnabled,
        product_update_emails_enabled: productUpdateEmailsEnabled,
      });
      await refetchPreferences();
      prefInitialized.current = false;
      setSaveMessage("Preferences updated.");
    } catch (error: unknown) {
      setSaveError(
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Failed to update preferences.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSendVerify() {
    setSendingVerify(true);
    setVerifyMessage(null);
    setVerifyError(null);
    try {
      await webApi.sendVerifyEmail();
      setVerifyMessage("Verification email sent. Check your inbox.");
    } catch (error: unknown) {
      setVerifyError(
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Failed to send verification email.",
      );
    } finally {
      setSendingVerify(false);
    }
  }

  async function handleSetEmail() {
    setEmailLoading(true);
    setEmailMessage(null);
    setEmailError(null);
    try {
      await webApi.setEmail(emailInput);
      setEmailMessage("Verification email sent. Check your inbox.");
      setEmailInput("");
      await refetchSession();
    } catch (error: unknown) {
      setEmailError(
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Failed to set email.",
      );
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleChangeEmail() {
    setEmailLoading(true);
    setEmailMessage(null);
    setEmailError(null);
    try {
      await webApi.changeEmail(emailInput);
      setEmailMessage("Check your inbox to confirm the change.");
      setEmailInput("");
      setShowChangeEmailForm(false);
    } catch (error: unknown) {
      setEmailError(
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Failed to change email.",
      );
    } finally {
      setEmailLoading(false);
    }
  }

  function openUnlinkDialog(provider: string) {
    setPendingUnlink(provider);
    setUnlinkDialogOpen(true);
  }

  async function handleUnlink() {
    if (!pendingUnlink) return;
    setUnlinkingProvider(pendingUnlink);
    setUnlinkDialogOpen(false);
    try {
      await webApi.unlinkProvider(pendingUnlink);
      await refetchSession();
    } finally {
      setUnlinkingProvider(null);
      setPendingUnlink(null);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await webApi.deleteAccount();
      queryClient.clear();
      router.push("/");
    } catch (error: unknown) {
      setDeleteError(
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Failed to delete account.",
      );
      setDeleting(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <div className="font-mono text-xs tracking-widest text-primary mb-2">// SETTINGS</div>
        <h1 className="text-3xl font-black tracking-tighter">SETTINGS</h1>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Account card */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>Identity and sign-in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-lg font-semibold text-foreground">{displayName}</p>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Member since {memberSince}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Email section */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Email address</p>

              {!session.email ? (
                /* No email — show set form */
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">No email on file.</p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="bg-secondary/50"
                    />
                    <Button
                      onClick={handleSetEmail}
                      disabled={emailLoading || !emailInput}
                    >
                      {emailLoading ? "Saving…" : "Set Email"}
                    </Button>
                  </div>
                  {emailMessage && <p className="text-sm text-muted-foreground">{emailMessage}</p>}
                  {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                </div>
              ) : !session.email_verified_at ? (
                /* Has email, not verified */
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{session.email}</span>
                    <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 bg-yellow-500/10 text-xs">
                      Unverified
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendVerify}
                      disabled={sendingVerify}
                    >
                      {sendingVerify ? "Sending…" : "Send verification email"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowChangeEmailForm((v) => !v);
                        setEmailMessage(null);
                        setEmailError(null);
                        setEmailInput("");
                      }}
                    >
                      Change email
                    </Button>
                  </div>
                  {verifyMessage && <p className="text-sm text-muted-foreground">{verifyMessage}</p>}
                  {verifyError && <p className="text-sm text-destructive">{verifyError}</p>}
                  {showChangeEmailForm && (
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="new@example.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="bg-secondary/50"
                      />
                      <Button
                        onClick={handleChangeEmail}
                        disabled={emailLoading || !emailInput}
                      >
                        {emailLoading ? "Saving…" : "Update"}
                      </Button>
                    </div>
                  )}
                  {emailMessage && showChangeEmailForm && (
                    <p className="text-sm text-muted-foreground">{emailMessage}</p>
                  )}
                  {emailError && showChangeEmailForm && (
                    <p className="text-sm text-destructive">{emailError}</p>
                  )}
                </div>
              ) : (
                /* Has email, verified */
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{session.email}</span>
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  </div>
                  {!showChangeEmailForm ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowChangeEmailForm(true);
                        setEmailMessage(null);
                        setEmailError(null);
                        setEmailInput("");
                      }}
                    >
                      Change email
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="email"
                          placeholder="new@example.com"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="bg-secondary/50"
                        />
                        <Button
                          onClick={handleChangeEmail}
                          disabled={emailLoading || !emailInput}
                        >
                          {emailLoading ? "Saving…" : "Update"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setShowChangeEmailForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                      {emailMessage && <p className="text-sm text-muted-foreground">{emailMessage}</p>}
                      {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Linked providers */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ShieldCheck className="h-4 w-4" />
                Sign-in methods
              </div>
              {linkedProviders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No linked providers.</p>
              ) : (
                <div className="space-y-2">
                  {linkedProviders.map((lp) => (
                    <div
                      key={lp.provider}
                      className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/20 px-3 py-2"
                    >
                      <span className="text-sm text-foreground">{providerLabel(lp.provider)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openUnlinkDialog(lp.provider)}
                        disabled={
                          linkedProviders.length <= 1 || unlinkingProvider === lp.provider
                        }
                        title={
                          linkedProviders.length <= 1
                            ? "Cannot unlink last sign-in method"
                            : undefined
                        }
                      >
                        <Unlink className="h-3.5 w-3.5 mr-1.5" />
                        {unlinkingProvider === lp.provider ? "Unlinking…" : "Unlink"}
                      </Button>
                    </div>
                  ))}
                  {linkedProviders.length <= 1 && (
                    <p className="text-xs text-muted-foreground">
                      Add another sign-in method before unlinking.
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preferences card */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">Preferences</CardTitle>
            <CardDescription>Currency, timezone, and alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {preferencesLoading ? (
              <div className="space-y-4">
                <div className="h-9 animate-pulse rounded bg-secondary/50" />
                <div className="h-9 animate-pulse rounded bg-secondary/50" />
              </div>
            ) : !preferences ? (
              <p className="text-sm text-muted-foreground">Preferences unavailable.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={preferredCurrency} onValueChange={setPreferredCurrency}>
                    <SelectTrigger className="w-full bg-secondary/50">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="w-full bg-secondary/50">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezoneOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Alert emails</p>
                      <p className="text-sm text-muted-foreground">Email on alert triggers</p>
                    </div>
                    <Switch checked={alertEmailsEnabled} onCheckedChange={setAlertEmailsEnabled} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Product updates</p>
                      <p className="text-sm text-muted-foreground">Release and product news</p>
                    </div>
                    <Switch
                      checked={productUpdateEmailsEnabled}
                      onCheckedChange={setProductUpdateEmailsEnabled}
                    />
                  </div>
                </div>

                {(saveMessage || saveError) && (
                  <p className={`text-sm ${saveError ? "text-destructive" : "text-muted-foreground"}`}>
                    {saveError ?? saveMessage}
                  </p>
                )}

                <Button onClick={handleSavePreferences} disabled={!hasChanges || saving}>
                  {saving ? "Saving…" : "Save Preferences"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible account actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Delete account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently deactivates and anonymizes your account.
                </p>
              </div>
              <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
                setDeleteDialogOpen(open);
                if (!open) {
                  setDeleteConfirmText("");
                  setDeleteError(null);
                }
              }}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete account</DialogTitle>
                    <DialogDescription>
                      This permanently deactivates your account and anonymizes all personal data.
                      This cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <Label htmlFor="delete-confirm">
                      Type <strong>DELETE</strong> to confirm
                    </Label>
                    <Input
                      id="delete-confirm"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="bg-secondary/50"
                    />
                    {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== "DELETE" || deleting}
                    >
                      {deleting ? "Deleting…" : "Delete Account"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unlink confirm dialog */}
      <Dialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlink {pendingUnlink ? providerLabel(pendingUnlink) : "provider"}</DialogTitle>
            <DialogDescription>
              You will no longer be able to sign in with{" "}
              {pendingUnlink ? providerLabel(pendingUnlink) : "this provider"}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleUnlink}>
              Unlink
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
