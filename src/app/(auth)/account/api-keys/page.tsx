"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Key,
  Copy,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Globe,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSession, useSubKeys, webApi } from "@/lib/api";
import { queryKeys } from "@/lib/api/hooks";
import type { ChildAPIKeyCreateResponse } from "@/lib/api/types";

type ReissueResponse = Awaited<ReturnType<typeof webApi.reissueAPIKey>>;

function isEmailRequiredError(message: string | null | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes("email") && (lower.includes("required") || lower.includes("verif"));
}

function EmailRequiredHint({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <p className="text-destructive font-medium">{message}</p>
      <p className="mt-1 text-muted-foreground">
        Add and verify your email address in{" "}
        <Link
          href="/account/settings"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          Account Settings
        </Link>
        , then come back here to issue your key.
      </p>
    </div>
  );
}

export default function AccountApiKeysPage() {
  const queryClient = useQueryClient();
  const { data: sessionData, isLoading, refetch: refetchSession } = useSession();
  const { data: subKeysData, isLoading: subKeysLoading, refetch: refetchSubKeys } = useSubKeys();

  // Root key state
  const [copied, setCopied] = useState(false);
  const [reissueDialogOpen, setReissueDialogOpen] = useState(false);
  const [newKey, setNewKey] = useState<ReissueResponse | null>(null);
  const [reissuing, setReissuing] = useState(false);
  const [reissueError, setReissueError] = useState<string | null>(null);
  const [resettingIp, setResettingIp] = useState(false);
  const [resetIpMessage, setResetIpMessage] = useState<string | null>(null);

  // Sub-key create
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createQuota, setCreateQuota] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newSubKey, setNewSubKey] = useState<ChildAPIKeyCreateResponse | null>(null);

  // Sub-key reissue
  const [reissueSubKeyId, setReissueSubKeyId] = useState<string | null>(null);
  const [reissuingSubKey, setReissuingSubKey] = useState(false);
  const [newSubKeyReissued, setNewSubKeyReissued] = useState<ChildAPIKeyCreateResponse | null>(null);
  const [reissueSubKeyError, setReissueSubKeyError] = useState<string | null>(null);

  // Sub-key delete
  const [deleteSubKeyId, setDeleteSubKeyId] = useState<string | null>(null);
  const [deletingSubKey, setDeletingSubKey] = useState(false);
  const [deleteSubKeyError, setDeleteSubKeyError] = useState<string | null>(null);

  // Sub-key rename
  const [renameSubKeyId, setRenameSubKeyId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Copy state per sub-key
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopy(text: string, id?: string) {
    await navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleReissue() {
    setReissuing(true);
    setReissueError(null);
    try {
      const response = await webApi.reissueAPIKey();
      setNewKey(response);
      await refetchSession();
    } catch (error: unknown) {
      setReissueError(
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Failed to reissue key",
      );
    } finally {
      setReissuing(false);
    }
  }

  async function handleResetIp() {
    setResettingIp(true);
    setResetIpMessage(null);
    try {
      await webApi.resetAPIKeyIP();
      setResetIpMessage("IP rebound. Your next request will set the new bound IP.");
      await refetchSession();
    } catch (error: unknown) {
      setResetIpMessage(
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Failed to rebind IP.",
      );
    } finally {
      setResettingIp(false);
    }
  }

  async function handleCreateSubKey() {
    setCreating(true);
    setCreateError(null);
    try {
      const quota = createQuota ? parseInt(createQuota, 10) : undefined;
      const response = await webApi.createSubKey({
        name: createName,
        quota_requests_per_month_override: quota ?? null,
      });
      setNewSubKey(response);
      await refetchSubKeys();
    } catch (error: unknown) {
      setCreateError(
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Failed to create sub-key.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleReissueSubKey(keyId: string) {
    setReissuingSubKey(true);
    setReissueSubKeyError(null);
    try {
      const response = await webApi.reissueSubKey(keyId);
      setNewSubKeyReissued(response);
      await refetchSubKeys();
    } catch (error: unknown) {
      setReissueSubKeyError(
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Failed to reissue sub-key.",
      );
    } finally {
      setReissuingSubKey(false);
    }
  }

  async function handleDeleteSubKey(keyId: string) {
    setDeletingSubKey(true);
    setDeleteSubKeyError(null);
    try {
      await webApi.deleteSubKey(keyId);
      setDeleteSubKeyId(null);
      await refetchSubKeys();
    } catch (error: unknown) {
      setDeleteSubKeyError(
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Failed to delete sub-key.",
      );
    } finally {
      setDeletingSubKey(false);
    }
  }

  async function handleRenameSubKey(keyId: string) {
    setRenaming(true);
    setRenameError(null);
    try {
      await webApi.updateSubKey(keyId, { name: renameValue });
      setRenameSubKeyId(null);
      setRenameValue("");
      queryClient.invalidateQueries({ queryKey: queryKeys.subKeys({}) });
      await refetchSubKeys();
    } catch (error: unknown) {
      setRenameError(
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "Failed to rename sub-key.",
      );
    } finally {
      setRenaming(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="h-8 w-48 bg-secondary/50 rounded animate-pulse mb-4" />
        <div className="h-32 bg-secondary/30 rounded animate-pulse" />
      </div>
    );
  }

  if (!sessionData) return null;

  const { active_key_summary, tier_info } = sessionData;
  const needsEmail = !sessionData.email || !sessionData.email_verified_at;
  const activeKey = active_key_summary.key;
  const maskedPrefix = activeKey ? `${activeKey.key_prefix}${"•".repeat(24)}` : null;
  const canManageSubKeys =
    sessionData.limits.max_child_api_keys == null ||
    sessionData.limits.max_child_api_keys !== 0;
  const subKeyLimit = sessionData.limits.max_child_api_keys;
  const subKeys = subKeysData?.keys ?? [];

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <div className="font-mono text-xs tracking-widest text-primary mb-2">// API KEYS</div>
          <h1 className="text-3xl font-black tracking-tighter">MANAGE KEYS</h1>
        </div>
        {!active_key_summary.has_active_key && (
          needsEmail ? (
            <Button asChild variant="outline">
              <Link href="/account/settings">
                <Key className="mr-2 h-4 w-4" />
                Add email in Settings
              </Link>
            </Button>
          ) : (
            <Button onClick={() => setReissueDialogOpen(true)}>
              <Key className="mr-2 h-4 w-4" />
              Create Key
            </Button>
          )
        )}
      </div>

      <Card className="bg-yellow-500/5 border-yellow-500/20 mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Keep your keys secret</p>
              <p className="text-sm text-muted-foreground mt-1">
                Never commit them. Use environment variables.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Root key */}
      {activeKey ? (
        <Card className="bg-card/50 border-border/50 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 shrink-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{activeKey.name ?? "Root Key"}</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                        Active
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created{" "}
                      {new Date(activeKey.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <code className="block w-full px-3 py-2 rounded-md bg-secondary/50 font-mono text-sm text-muted-foreground truncate">
                    {maskedPrefix}
                  </code>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Full key not stored — regenerate to retrieve a new one.
                  </p>
                </div>
                <Dialog
                  open={reissueDialogOpen}
                  onOpenChange={(open) => {
                    setReissueDialogOpen(open);
                    if (!open) setNewKey(null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Regenerate API Key</DialogTitle>
                      <DialogDescription>
                        Current key is invalidated immediately. Integrations will break until updated.
                      </DialogDescription>
                    </DialogHeader>
                    {newKey ? (
                      <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground">{newKey.message}</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-3 py-2 rounded-md bg-secondary/50 font-mono text-xs text-foreground break-all">
                            {newKey.key}
                          </code>
                          <Button variant="ghost" size="icon" onClick={() => handleCopy(newKey.key)}>
                            {copied ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {reissueError && (
                          isEmailRequiredError(reissueError)
                            ? <EmailRequiredHint message={reissueError} />
                            : <p className="text-sm text-destructive">{reissueError}</p>
                        )}
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setReissueDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button variant="destructive" onClick={handleReissue} disabled={reissuing}>
                            {reissuing ? "Regenerating…" : "Regenerate"}
                          </Button>
                        </DialogFooter>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border/50 bg-secondary/20 p-4">
                  <div className="text-sm text-muted-foreground">Monthly Limit</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {(activeKey.effective_quota_requests_per_month ?? tier_info.quota_requests_per_month).toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg border border-border/50 bg-secondary/20 p-4">
                  <div className="text-sm text-muted-foreground">Requests / Minute</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {(activeKey.effective_rate_requests_per_minute ?? tier_info.rate_requests_per_minute).toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg border border-border/50 bg-secondary/20 p-4">
                  <div className="text-sm text-muted-foreground">IP Restriction</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {activeKey.bound_ip ?? "None"}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={handleResetIp} disabled={resettingIp}>
                  <Globe className="mr-2 h-4 w-4" />
                  {resettingIp ? "Removing…" : "Remove IP Restriction"}
                </Button>
                {resetIpMessage && <p className="text-sm text-muted-foreground">{resetIpMessage}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/50 border-border/50 mb-6">
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Key className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">No API key yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                {needsEmail
                  ? "You need a verified email address before you can issue an API key."
                  : "Create an API key to start using the API."}
              </p>
            </div>
            {needsEmail ? (
              <Button asChild>
                <Link href="/account/settings">
                  <Key className="mr-2 h-4 w-4" />
                  Add email in Settings
                </Link>
              </Button>
            ) : (
              <Button onClick={() => setReissueDialogOpen(true)}>
                <Key className="mr-2 h-4 w-4" />
                Create Key
              </Button>
            )}
            <Dialog open={reissueDialogOpen} onOpenChange={(open) => {
              setReissueDialogOpen(open);
              if (!open) setNewKey(null);
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                  <DialogDescription>
                    A new API key will be created for your account.
                  </DialogDescription>
                </DialogHeader>
                {newKey ? (
                  <div className="space-y-4 py-2">
                    <p className="text-sm text-muted-foreground">{newKey.message}</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 rounded-md bg-secondary/50 font-mono text-xs text-foreground break-all">
                        {newKey.key}
                      </code>
                      <Button variant="ghost" size="icon" onClick={() => handleCopy(newKey.key)}>
                        {copied ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {reissueError && (
                      isEmailRequiredError(reissueError)
                        ? <EmailRequiredHint message={reissueError} />
                        : <p className="text-sm text-destructive">{reissueError}</p>
                    )}
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setReissueDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleReissue} disabled={reissuing}>
                        {reissuing ? "Creating…" : "Create Key"}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Sub-keys section */}
      {canManageSubKeys && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Sub-Keys</CardTitle>
                <CardDescription>
                  Child API keys with independent rate limits
                  {subKeyLimit != null && subKeyLimit !== -1 && ` · ${subKeys.length} / ${subKeyLimit} used`}
                </CardDescription>
              </div>
              <Dialog
                open={createDialogOpen}
                onOpenChange={(open) => {
                  setCreateDialogOpen(open);
                  if (!open) {
                    setCreateName("");
                    setCreateQuota("");
                    setCreateError(null);
                    setNewSubKey(null);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    disabled={
                      !active_key_summary.has_active_key ||
                      (subKeyLimit != null && subKeyLimit !== -1 && subKeys.length >= subKeyLimit)
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Sub-Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Sub-Key</DialogTitle>
                    <DialogDescription>
                      Sub-keys inherit your tier limits unless overridden.
                    </DialogDescription>
                  </DialogHeader>
                  {newSubKey ? (
                    <div className="space-y-4 py-2">
                      <p className="text-sm text-muted-foreground">
                        {newSubKey.message ?? "Store this key securely. It will not be shown again."}
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 rounded-md bg-secondary/50 font-mono text-xs text-foreground break-all">
                          {newSubKey.key}
                        </code>
                        <Button variant="ghost" size="icon" onClick={() => handleCopy(newSubKey.key, "new-sub")}>
                          {copiedId === "new-sub" ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => setCreateDialogOpen(false)}>Done</Button>
                      </DialogFooter>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <Label htmlFor="sub-key-name">Name</Label>
                          <Input
                            id="sub-key-name"
                            value={createName}
                            onChange={(e) => setCreateName(e.target.value)}
                            placeholder="e.g. Production, Dev"
                            className="bg-secondary/50"
                            maxLength={100}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sub-key-quota">
                            Monthly quota cap{" "}
                            <span className="text-muted-foreground font-normal">(optional)</span>
                          </Label>
                          <Input
                            id="sub-key-quota"
                            type="number"
                            min={1}
                            value={createQuota}
                            onChange={(e) => setCreateQuota(e.target.value)}
                            placeholder={`Max ${tier_info.quota_requests_per_month.toLocaleString()}`}
                            className="bg-secondary/50"
                          />
                        </div>
                        {createError && (
                          isEmailRequiredError(createError)
                            ? <EmailRequiredHint message={createError} />
                            : <p className="text-sm text-destructive">{createError}</p>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateSubKey} disabled={creating || !createName}>
                          {creating ? "Creating…" : "Create"}
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {subKeysLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded bg-secondary/30" />
                ))}
              </div>
            ) : subKeys.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Key className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No sub-keys yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subKeys.map(({ key: sk, requests_this_month }) => (
                  <div
                    key={sk.id}
                    className="rounded-lg border border-border/40 bg-secondary/10 p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        {renameSubKeyId === sk.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              className="h-7 bg-secondary/50 text-sm"
                              maxLength={100}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameSubKey(sk.id);
                                if (e.key === "Escape") setRenameSubKeyId(null);
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => handleRenameSubKey(sk.id)}
                              disabled={renaming || !renameValue}
                            >
                              {renaming ? "…" : "Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRenameSubKeyId(null)}
                            >
                              Cancel
                            </Button>
                            {renameError && <p className="text-xs text-destructive">{renameError}</p>}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground truncate">
                              {sk.name ?? "Unnamed"}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                setRenameSubKeyId(sk.id);
                                setRenameValue(sk.name ?? "");
                                setRenameError(null);
                              }}
                              title="Rename"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <code>{sk.key_prefix}{"•".repeat(16)}</code>
                          <span>{requests_this_month.toLocaleString()} req this month</span>
                          <span>
                            Limit:{" "}
                            {(
                              sk.effective_quota_requests_per_month ??
                              tier_info.quota_requests_per_month
                            ).toLocaleString()}
                          </span>
                          <span>
                            Created{" "}
                            {new Date(sk.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Reissue */}
                        <Dialog
                          open={reissueSubKeyId === sk.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setReissueSubKeyId(sk.id);
                              setNewSubKeyReissued(null);
                              setReissueSubKeyError(null);
                            } else {
                              setReissueSubKeyId(null);
                              setNewSubKeyReissued(null);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Reissue key">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reissue Sub-Key</DialogTitle>
                              <DialogDescription>
                                The current value for <strong>{sk.name ?? "this key"}</strong> will
                                be invalidated immediately.
                              </DialogDescription>
                            </DialogHeader>
                            {newSubKeyReissued ? (
                              <div className="space-y-4 py-2">
                                <p className="text-sm text-muted-foreground">
                                  {newSubKeyReissued.message ?? "Store this key securely."}
                                </p>
                                <div className="flex items-center gap-2">
                                  <code className="flex-1 px-3 py-2 rounded-md bg-secondary/50 font-mono text-xs text-foreground break-all">
                                    {newSubKeyReissued.key}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleCopy(newSubKeyReissued.key, sk.id)}
                                  >
                                    {copiedId === sk.id ? (
                                      <CheckCircle className="h-4 w-4 text-green-400" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                                <DialogFooter>
                                  <Button onClick={() => setReissueSubKeyId(null)}>Done</Button>
                                </DialogFooter>
                              </div>
                            ) : (
                              <>
                                {reissueSubKeyError && (
                                  <p className="text-sm text-destructive">{reissueSubKeyError}</p>
                                )}
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => setReissueSubKeyId(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleReissueSubKey(sk.id)}
                                    disabled={reissuingSubKey}
                                  >
                                    {reissuingSubKey ? "Reissuing…" : "Reissue"}
                                  </Button>
                                </DialogFooter>
                              </>
                            )}
                          </DialogContent>
                        </Dialog>

                        {/* Delete */}
                        <Dialog
                          open={deleteSubKeyId === sk.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setDeleteSubKeyId(sk.id);
                              setDeleteSubKeyError(null);
                            } else {
                              setDeleteSubKeyId(null);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Delete key" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Sub-Key</DialogTitle>
                              <DialogDescription>
                                Permanently revoke <strong>{sk.name ?? "this key"}</strong>. Any
                                integrations using it will stop working immediately.
                              </DialogDescription>
                            </DialogHeader>
                            {deleteSubKeyError && (
                              <p className="text-sm text-destructive">{deleteSubKeyError}</p>
                            )}
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setDeleteSubKeyId(null)}>
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleDeleteSubKey(sk.id)}
                                disabled={deletingSubKey}
                              >
                                {deletingSubKey ? "Deleting…" : "Delete"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
