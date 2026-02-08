"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api-client";
import { useTenant } from "@/components/providers/tenant-provider";

type Reward = { id: number; name: string; description?: string | null; active?: boolean };
type AllowedReward = { id: number; name: string };

function GenerateReferralHostContent() {
  const searchParams = useSearchParams();
  const { tenantSlug: ctxTenant } = useTenant();

  const [step, setStep] = useState(1);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [allowedRewards, setAllowedRewards] = useState<AllowedReward[] | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    selectedReward: "",
    campaignId: null as string | null,
  });
  const [generatedLink, setGeneratedLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const tenantSlug = useMemo(() => ctxTenant || searchParams.get("tenant") || "", [ctxTenant, searchParams]);
  const token = searchParams.get("token");

  const rewardOptions = useMemo<Reward[]>(() => {
    if (allowedRewards && allowedRewards.length > 0) {
      const allowedNames = new Set(allowedRewards.map((r) => r.name));
      const filtered = rewards.filter((r) => allowedNames.has(r.name));
      if (filtered.length > 0) return filtered;
      return allowedRewards.map((r) => ({ id: r.id, name: r.name || String(r.id), description: null }));
    }
    return rewards;
  }, [allowedRewards, rewards]);

  const selectedReward = useMemo(
    () => rewardOptions.find((reward) => reward.name === formData.selectedReward) || null,
    [rewardOptions, formData.selectedReward]
  );

  useEffect(() => {
    const loadRewards = async () => {
      try {
        const res = await apiFetch<Reward[]>("/api/rewards/active");
        const rewardsData = Array.isArray(res) ? res : [];
        setRewards(rewardsData);
      } catch (err) {
        console.error("Failed to fetch rewards", err);
        const fallback = [
          { id: 1, name: "Service Discount" },
          { id: 2, name: "Free Laundry" },
          { id: 3, name: "Pest Treatment" },
        ];
        setRewards(fallback);
      }
    };
    loadRewards();
  }, []);

  useEffect(() => {
    const first = rewardOptions[0]?.name || "";
    setFormData((prev) => ({ ...prev, selectedReward: first }));
  }, [rewardOptions]);

  useEffect(() => {
    if (!token) return;
    const validateToken = async () => {
      try {
        const res = await apiFetch<{ name?: string; email?: string; campaignId?: string | null; allowedRewards?: AllowedReward[] }>(
          `/api/users/validate-client-token?token=${encodeURIComponent(token)}`
        );
        const { name, email, campaignId, allowedRewards: ar } = res || {};
        if (ar && Array.isArray(ar)) {
          setAllowedRewards(ar);
        } else {
          setAllowedRewards(null);
        }
        setFormData((prev) => ({
          ...prev,
          name: name || prev.name,
          email: email || prev.email,
          campaignId: campaignId || null,
        }));
      } catch (err: unknown) {
        console.error("Failed to validate token:", err);
        setError("Unable to pre-fill form. You can still enter your information manually.");
      }
    };
    validateToken();
  }, [token]);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...formData,
        email: formData.email.toLowerCase(),
        // tenantSlug optional; backend resolves from host
        ...(tenantSlug ? { tenantSlug } : {}),
      };
      const res = await apiFetch<{ code: string }>(`/api/referrals`, {
        method: "POST",
        body: payload,
      });
      const { code } = res;
      const link = `${window.location.origin}/referral/${code}`;
      setGeneratedLink(link);
      setStep(2);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error generating link";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Generate Referral Link</CardTitle>
          <CardDescription>Create a personalized referral link to share.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {step === 1 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Your Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Reward</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={formData.selectedReward}
                    onValueChange={(value) => handleChange("selectedReward", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reward" />
                    </SelectTrigger>
                    <SelectContent>
                  {rewardOptions.map((reward) => (
                    <SelectItem key={reward.id} value={reward.name}>
                      {reward.name}
                    </SelectItem>
                  ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant={selectedReward?.description ? "outline" : "ghost"}
                    className={`h-8 px-3 text-xs ${selectedReward?.description ? "border-slate-900 text-slate-900" : ""}`}
                    onClick={() => setDetailOpen(true)}
                    disabled={!selectedReward}
                  >
                    More details
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Generating..." : "Generate Link"}
              </Button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Alert>
                <AlertTitle>Link Generated</AlertTitle>
                <AlertDescription>
                  Share this link with your prospect:
                  <div className="mt-2 break-words font-medium text-blue-700">{generatedLink}</div>
                </AlertDescription>
              </Alert>
              <Badge variant="outline">Reward: {formData.selectedReward}</Badge>
              <Button
                type="button"
                className="w-full"
                onClick={() => generatedLink && navigator.clipboard.writeText(generatedLink)}
              >
                Copy Link
              </Button>
              <Button onClick={() => setStep(1)} variant="outline" className="w-full">
                Generate Another
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reward details</DialogTitle>
          </DialogHeader>
          {selectedReward ? (
            <div className="space-y-2 text-sm text-slate-700">
              <div className="font-medium text-slate-900">{selectedReward.name}</div>
              <div>{selectedReward.description || "No description provided."}</div>
            </div>
          ) : (
            <div className="text-sm text-slate-600">Select a reward to see details.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function GenerateReferralHostPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-600">Loading…</div>}>
      <GenerateReferralHostContent />
    </Suspense>
  );
}

