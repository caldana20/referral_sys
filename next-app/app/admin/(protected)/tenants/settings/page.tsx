"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

type TenantSettings = {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string | null;
};

type SenderInfo = {
  exists: boolean;
  fromName?: string;
  fromEmail?: string;
  sendgridSenderId?: string;
  status?: string;
  verified?: boolean;
  lastError?: string | null;
};

export default function TenantSettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [sender, setSender] = useState<SenderInfo | null>(null);
  const [senderLoading, setSenderLoading] = useState(false);
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [testRecipient, setTestRecipient] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    const load = async () => {
      setSenderLoading(true);
      try {
        const res = await apiFetch<TenantSettings>("/api/tenants/settings", {
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        });
        setSettings(res);
        setName(res?.name || "");
        const senderRes = await apiFetch<SenderInfo>("/api/senders", {
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        });
        setSender(senderRes);
        if (senderRes?.fromName) setFromName(senderRes.fromName);
        if (senderRes?.fromEmail) setFromEmail(senderRes.fromEmail);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load settings";
        toast.error(message);
      } finally {
        setSenderLoading(false);
      }
    };
    load();
  }, [logout, router]);

  const handleSave = async () => {
    if (!settings) return;

    const formData = new FormData();
    if (name.trim()) formData.append("name", name.trim());
    if (logoFile) formData.append("logo", logoFile);

    setSaving(true);
    try {
      const res = await apiFetch<TenantSettings>("/api/tenants/settings", {
        method: "PATCH",
        body: formData,
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      setSettings(res);
      if (logoFile && logoPreview) setLogoPreview(null);
      setLogoFile(null);
      toast.success("Settings updated");
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      const message =
        status === 413
          ? "Upload too large. Please use an image under 10 MB."
          : err instanceof Error
          ? err.message
          : "Failed to save settings";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSender = async () => {
    if (!fromName.trim() || !fromEmail.trim()) {
      toast.error("Sender name and email are required");
      return;
    }
    setSenderLoading(true);
    try {
      const res = await apiFetch<SenderInfo>("/api/senders", {
        method: "POST",
          body: JSON.stringify({
            fromName: fromName.trim(),
            fromEmail: fromEmail.trim(),
          }),
        headers: { "Content-Type": "application/json" },
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      setSender(res);
      toast.success("Verification email sent. Please check the inbox and click the SendGrid link.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create sender";
      toast.error(message);
    } finally {
      setSenderLoading(false);
    }
  };

  const handleRefreshSender = async () => {
    setSenderLoading(true);
    try {
      const res = await apiFetch<SenderInfo>("/api/senders", {
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      setSender(res);
      toast.success("Sender status refreshed");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to refresh sender";
      toast.error(message);
    } finally {
      setSenderLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testRecipient.trim()) {
      toast.error("Enter a test recipient email");
      return;
    }
    setSendingTest(true);
    try {
      await apiFetch("/api/senders/test", {
        method: "POST",
        body: JSON.stringify({ to: testRecipient.trim() }),
        headers: { "Content-Type": "application/json" },
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      toast.success("Test email sent");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send test email";
      toast.error(message);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tenant Settings</CardTitle>
          <CardDescription>Update tenant name and logo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Slug</Label>
            <Input value={settings?.slug || ""} disabled />
          </div>
          {settings?.logoUrl ? (
            <div className="space-y-1">
              <Label>Logo</Label>
              <img
                src={logoPreview || settings.logoUrl}
                alt="Tenant logo"
                className="h-12 w-12 rounded border object-contain"
              />
            </div>
          ) : null}
          <div className="space-y-1">
            <Label>Upload New Logo</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setLogoFile(file);
                setLogoPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
          </div>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Sender (SendGrid Single Sender)</CardTitle>
          <CardDescription>
            Create a tenant-specific sender. SendGrid will email a verification link to the From address. The link
            must be clicked before emails can be sent from this sender. Address fields are required by SendGrid for
            single sender.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>From Name</Label>
              <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>From Email</Label>
              <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreateSender} disabled={senderLoading}>
              {senderLoading ? "Working..." : sender?.exists ? "Resend Verification" : "Create Sender"}
            </Button>
            <Button variant="outline" onClick={handleRefreshSender} disabled={senderLoading}>
              Refresh Status
            </Button>
          </div>

          {sender ? (
            <div className="space-y-1 text-sm">
              <div>Status: {sender.verified ? "Verified" : sender.status || "Unknown"}</div>
              {sender.fromEmail ? <div>Current: {sender.fromName} &lt;{sender.fromEmail}&gt;</div> : null}
              {sender.lastError ? <div className="text-red-600">Last error: {sender.lastError}</div> : null}
              {sender.sendgridSenderId ? <div>Sender ID: {sender.sendgridSenderId}</div> : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Send Test Email (requires verified sender)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="recipient@example.com"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
              />
              <Button onClick={handleSendTest} disabled={sendingTest || !sender?.verified}>
                {sendingTest ? "Sending..." : "Send Test"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

