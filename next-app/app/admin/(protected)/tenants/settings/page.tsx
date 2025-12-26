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

export default function TenantSettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch<TenantSettings>("/api/tenants/settings", {
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        });
        setSettings(res);
        setName(res?.name || "");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load settings";
        toast.error(message);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenant Settings</CardTitle>
        <CardDescription>Update tenant name. (Logo upload not yet wired in this UI.)</CardDescription>
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
  );
}

