"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";

type Reward = { id: number; name: string; active?: boolean };

export default function GenerateReferralPage() {
  const { tenant } = useParams<{ tenant: string }>();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    prospectName: "",
    prospectEmail: "",
    selectedReward: "",
  });
  const [generatedLink, setGeneratedLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoadingClientInfo, setIsLoadingClientInfo] = useState(false);

  const tenantSlug = useMemo(() => tenant || searchParams.get("tenant") || "", [tenant, searchParams]);
  const token = searchParams.get("token");

  useEffect(() => {
    const loadRewards = async () => {
      try {
        if (!tenantSlug) {
          setError("Missing tenant. Please use a valid referral link.");
          return;
        }
        const res = await apiFetch<Reward[]>(`/api/rewards/active?tenantSlug=${encodeURIComponent(tenantSlug)}`);
        const rewardsData = Array.isArray(res) ? res : [];
        setRewards(rewardsData);
        if (rewardsData.length > 0) {
          setFormData((prev) => ({ ...prev, selectedReward: rewardsData[0].name }));
        }
      } catch (err) {
        console.error("Failed to fetch rewards", err);
        const fallback = [
          { id: 1, name: "Service Discount" },
          { id: 2, name: "Free Laundry" },
          { id: 3, name: "Pest Treatment" },
        ];
        setRewards(fallback);
        setFormData((prev) => ({ ...prev, selectedReward: fallback[0].name }));
      }
    };
    loadRewards();
  }, [tenantSlug]);

  useEffect(() => {
    if (!token) return;
    const validateToken = async () => {
      setIsLoadingClientInfo(true);
      try {
        const res = await apiFetch<{ name?: string; email?: string }>(
          `/api/users/validate-client-token?token=${encodeURIComponent(token)}`
        );
        const { name, email } = res || {};
        setFormData((prev) => ({
          ...prev,
          name: name || prev.name,
          email: email || prev.email,
        }));
      } catch (err: unknown) {
        console.error("Failed to validate token:", err);
        setError("Unable to pre-fill form. You can still enter your information manually.");
      } finally {
        setIsLoadingClientInfo(false);
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
    if (!tenantSlug) {
      setError("Missing tenant. Please use a valid referral link.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...formData,
        email: formData.email.toLowerCase(),
        tenantSlug: tenantSlug,
      };
      const res = await apiFetch<{ code: string }>(`/api/referrals`, {
        method: "POST",
        body: payload,
      });
      const { code } = res;
      const link = `${window.location.origin}/tenant/${tenantSlug}/referral/${code}`;
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex flex-1 flex-col md:flex-row">
        {/* Left Side */}
        <div className="md:w-1/2 bg-slate-900 text-white p-10 flex flex-col justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-300">Referral Program</p>
            <h1 className="mt-3 text-3xl font-bold">Share & Earn</h1>
            <p className="mt-3 text-slate-300">
              Generate a unique referral link for your prospect. When they request an estimate, we’ll track it and
              reward you.
            </p>
          </div>
          <div className="space-y-4 mt-10">
            <p className="text-sm font-semibold text-slate-200">Available rewards</p>
            <div className="flex flex-wrap gap-2">
              {rewards.map((r) => (
                <Badge key={r.id} variant="outline" className="border-slate-200 text-slate-100">
                  {r.name}
                </Badge>
              ))}
              {rewards.length === 0 ? <p className="text-sm text-slate-300">No rewards configured yet.</p> : null}
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="md:w-1/2 p-10 bg-white">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Generate Referral Link</h1>
          <p className="text-sm text-slate-600 mb-6">Enter your info and your prospect’s details.</p>

          {isLoadingClientInfo && (
            <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
              <AlertTitle>Loading your information…</AlertTitle>
              <AlertDescription>Pre-filling from your invite link.</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Details</CardTitle>
                <CardDescription>We use this to match the referral to your account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1">
                  <Label>Your Full Name</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="John Doe"
                    disabled={isLoadingClientInfo}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Your Email</Label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="client@example.com"
                    disabled={isLoadingClientInfo}
                  />
                  <p className="text-xs text-slate-500">Must be an active client email.</p>
                </div>

                <div className="pt-2 space-y-4">
                  <div className="space-y-1">
                    <Label>Prospect Name (optional)</Label>
                    <Input
                      value={formData.prospectName}
                      onChange={(e) => handleChange("prospectName", e.target.value)}
                      placeholder="Friend's name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Prospect Email (optional)</Label>
                    <Input
                      type="email"
                      value={formData.prospectEmail}
                      onChange={(e) => handleChange("prospectEmail", e.target.value)}
                      placeholder="friend@example.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Reward</Label>
                    <Select
                      value={formData.selectedReward}
                      onValueChange={(val) => handleChange("selectedReward", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select reward" />
                      </SelectTrigger>
                      <SelectContent>
                        {rewards.map((reward) => (
                          <SelectItem key={reward.id} value={reward.name}>
                            {reward.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button className="w-full" onClick={handleSubmit} disabled={loading || isLoadingClientInfo}>
                  {loading ? "Creating..." : "Get Reward Link"}
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="text-center space-y-6 py-8">
              <CardHeader>
                <CardTitle className="text-2xl text-green-600">Link Ready!</CardTitle>
                <CardDescription>Share this link with your friend to claim your reward.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <Input readOnly value={generatedLink} className="bg-transparent text-center font-mono" />
                  <Button onClick={() => navigator.clipboard.writeText(generatedLink)}>Copy</Button>
                </div>
                <Button variant="link" onClick={() => setStep(1)}>
                  Create another link
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

