"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

type TenantSettings = {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string | null;
  logoMediaId?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
};

type Country = { code: string; name: string };
type StateType = { code: string; name: string };

type SenderInfo = {
  exists: boolean;
  fromName?: string;
  fromEmail?: string;
  sendgridSenderId?: string;
  status?: string;
  verified?: boolean;
  lastError?: string | null;
};

type MediaItem = {
  id: number;
  url: string;
  signedUrl?: string | null;
  filename?: string | null;
  contentType?: string | null;
  size?: number | null;
  createdAt?: string;
};

export default function TenantSettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<StateType[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoMediaId, setLogoMediaId] = useState<number | null>(null);
  const [logoClear, setLogoClear] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [sender, setSender] = useState<SenderInfo | null>(null);
  const [senderLoading, setSenderLoading] = useState(false);
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [testRecipient, setTestRecipient] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [resetting, setResetting] = useState(false);

  const applySenderState = (data: SenderInfo | null) => {
    setSender(data);
    if (data?.fromName) setFromName(data.fromName);
    if (data?.fromEmail) setFromEmail(data.fromEmail);
  };


  const loadMedia = async () => {
    setMediaLoading(true);
    try {
      const res = await apiFetch<MediaItem[]>("/api/media", {
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      setMediaItems(Array.isArray(res) ? res : []);
      setMediaLoaded(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load media");
    } finally {
      setMediaLoading(false);
    }
  };

  const openMediaDialog = () => {
    setMediaDialogOpen(true);
    if (!mediaLoaded) {
      loadMedia();
    }
  };

  const handleSelectLogoMedia = (item: MediaItem) => {
    setLogoMediaId(item.id);
    setLogoPreview(item.signedUrl || item.url || null);
    setLogoClear(false);
    setMediaDialogOpen(false);
  };

  const handleClearLogo = () => {
    setLogoMediaId(null);
    setLogoPreview(null);
    setLogoClear(true);
  };

  useEffect(() => {
    const loadCountries = async () => {
      setGeoLoading(true);
      try {
        const res = await apiFetch<Country[]>("/api/meta/countries", {
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        });
        setCountries(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error("Failed to load countries", err);
      } finally {
        setGeoLoading(false);
      }
    };
    loadCountries();
  }, [logout, router]);

  // If the stored country is a name (not a code), normalize it to a code once countries load
  useEffect(() => {
    if (!country || countries.length === 0) return;
    const found = countries.find(
      (c) => c.code.toLowerCase() === country.toLowerCase() || c.name.toLowerCase() === country.toLowerCase()
    );
    if (found && found.code !== country) {
      setCountry(found.code);
    }
  }, [countries, country]);

  useEffect(() => {
    const loadStates = async () => {
      if (!country) {
        setStates([]);
        return;
      }
      setGeoLoading(true);
      try {
        const res = await apiFetch<StateType[]>(`/api/meta/countries/${country}/states`, {
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        });
        const list = Array.isArray(res) ? res : [];
        setStates(list);
        setState((prev) => {
          if (!prev) return "";
          const matchCode = list.find((st) => st.code.toLowerCase() === prev.toLowerCase());
          if (matchCode) return matchCode.code;
          const matchName = list.find((st) => st.name.toLowerCase() === prev.toLowerCase());
          if (matchName) return matchName.code;
          return "";
        });
      } catch (err) {
        console.error("Failed to load states", err);
        setStates([]);
      } finally {
        setGeoLoading(false);
      }
    };
    loadStates();
  }, [country, logout, router]);

  // Normalize state/province if stored value is a name instead of a code
  useEffect(() => {
    if (!state || states.length === 0) return;
    const matchByCode = states.some((st) => st.code.toLowerCase() === state.toLowerCase());
    if (matchByCode) return;
    const found = states.find((st) => st.name.toLowerCase() === state.toLowerCase());
    if (found) setState(found.code);
  }, [state, states]);

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
        setAddress(res?.address || "");
        setCity(res?.city || "");
        setState(res?.state || "");
        setZip(res?.zip || "");
        setCountry(res?.country || "");
        setLogoMediaId(res?.logoMediaId ?? null);
        if (res?.logoMediaId) {
          try {
            const mediaRes = await apiFetch<MediaItem[]>("/api/media", {
              onUnauthorized: () => {
                logout();
                router.replace("/admin/login");
              },
            });
            const list = Array.isArray(mediaRes) ? mediaRes : [];
            setMediaItems(list);
            setMediaLoaded(true);
            const match = list.find((m) => m.id === res.logoMediaId);
            if (match) {
              setLogoPreview(match.signedUrl || match.url || null);
            }
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to load logo media");
          }
        }
        const senderRes = await apiFetch<SenderInfo>("/api/senders", {
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        });
        applySenderState(senderRes);

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
    if (address.trim()) formData.append("address", address.trim());
    if (city.trim()) formData.append("city", city.trim());
    if (state.trim()) formData.append("state", state.trim());
    if (zip.trim()) formData.append("zip", zip.trim());
    if (country.trim()) formData.append("country", country.trim());
    if (logoMediaId !== null) {
      formData.append("logoMediaId", String(logoMediaId));
    } else if (logoClear) {
      formData.append("logoMediaId", "");
    }

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
      setAddress(res?.address || "");
      setCity(res?.city || "");
      setState(res?.state || "");
      setZip(res?.zip || "");
      setCountry(res?.country || "");
      setLogoMediaId(res?.logoMediaId ?? null);
      setLogoPreview(null);
      setLogoClear(false);
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
      applySenderState(res);
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
      applySenderState(res);
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

  const handleResetSender = async () => {
    setResetting(true);
    try {
      await apiFetch("/api/senders", {
        method: "DELETE",
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      applySenderState(null);
      setFromName("");
      setFromEmail("");
      toast.success("Sender reset. Configure a new sender.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset sender";
      toast.error(message);
    } finally {
      setResetting(false);
    }
  };


  const selectedLogoMedia = logoMediaId ? mediaItems.find((m) => m.id === logoMediaId) : null;
  const logoDisplay = logoPreview || selectedLogoMedia?.signedUrl || selectedLogoMedia?.url || settings?.logoUrl || null;

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
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1 md:col-span-2">
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
            </div>
            <div className="space-y-1">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            </div>
            <div className="space-y-1">
              <Label>ZIP/Postal Code</Label>
              <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="Postal code" />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Select
                value={country}
                onValueChange={(val) => {
                  setCountry(val);
                }}
                disabled={geoLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((ct) => (
                    <SelectItem key={ct.code} value={ct.code}>
                      {ct.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>State/Province</Label>
              {states.length > 0 ? (
                <Select
                  value={state}
                  onValueChange={(val) => {
                    setState(val);
                  }}
                  disabled={geoLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((st) => (
                      <SelectItem key={st.code} value={st.code}>
                        {st.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State / Province"
                  disabled={geoLoading}
                />
              )}
            </div>
          </div>
          {logoDisplay ? (
            <div className="space-y-1">
              <Label>Logo</Label>
              <img
                src={logoDisplay}
                alt="Tenant logo"
                className="h-12 w-12 rounded border object-contain"
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">No logo selected.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={openMediaDialog}>
              Choose from media
            </Button>
            {(settings?.logoUrl || logoMediaId || logoPreview) && (
              <Button type="button" variant="ghost" onClick={handleClearLogo}>
                Remove logo
              </Button>
            )}
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

          {!sender?.verified ? (
            <div className="flex gap-2">
              <Button onClick={handleCreateSender} disabled={senderLoading}>
                {senderLoading ? "Working..." : sender?.exists ? "Resend Verification" : "Create Sender"}
              </Button>
              <Button variant="outline" onClick={handleRefreshSender} disabled={senderLoading}>
                Refresh Status
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleResetSender} disabled={resetting}>
                {resetting ? "Resetting..." : "Reset Sender"}
              </Button>
            </div>
          )}

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

      <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select logo image</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between pb-2">
            <div className="text-sm text-slate-600">Choose an image from the media gallery.</div>
            <Button variant="outline" size="sm" onClick={loadMedia} disabled={mediaLoading}>
              {mediaLoading ? "Loading..." : "Refresh"}
            </Button>
          </div>
          {mediaLoading ? (
            <div className="text-sm text-slate-600">Loading...</div>
          ) : mediaItems.length === 0 ? (
            <div className="text-sm text-slate-600">No media found. Upload images first.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {mediaItems.map((item) => {
                const preview = item.signedUrl || item.url;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectLogoMedia(item)}
                    className="group rounded border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow"
                  >
                    <div className="aspect-square w-full overflow-hidden border-b bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt={item.filename || "media"} className="h-full w-full object-cover" />
                    </div>
                    <div className="p-2 text-xs text-slate-700">
                      <div className="truncate font-medium" title={item.filename || ""}>
                        {item.filename || "Untitled"}
                      </div>
                      <div className="text-slate-500">{item.contentType || ""}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

