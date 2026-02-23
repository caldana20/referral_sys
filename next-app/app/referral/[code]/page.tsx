"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useTenant } from "@/components/providers/tenant-provider";
import { EstimateRequestForm, type EstimateFieldConfig } from "@/components/estimate/estimate-request-form";

type ReferralResponse = {
  code: string;
  used?: boolean;
  fieldConfig?: EstimateFieldConfig[];
  tenant?: { name?: string; logoUrl?: string | null; estimateHeaderImageUrl?: string | null };
  newCode?: string;
};

export default function ReferralLandingHostPage() {
  const { code } = useParams<{ code: string }>();
  const { tenantSlug } = useTenant();

  const [valid, setValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [used, setUsed] = useState(false);
  const [referralData, setReferralData] = useState<ReferralResponse | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    description: "",
    notes: "",
  });
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const checkCode = async () => {
      try {
        if (!code) {
          setValid(false);
          return;
        }
        const qs = tenantSlug ? `?tenantSlug=${tenantSlug}` : "";
        const res = await apiFetch<ReferralResponse>(`/api/referrals/code/${code}${qs}`);
        setValid(true);
        setReferralData(res);
        if (Array.isArray(res.fieldConfig)) {
          setCustomFields((prev) => {
            const next = { ...prev };
            res.fieldConfig!.forEach((f) => {
              if (next[f.id] === undefined) next[f.id] = "";
            });
            return next;
          });
        }
        if (res.used) {
          if (res.newCode) {
            // Redirect prospect to the new referral code generated for them
            setRedirecting(true);
            window.location.replace(`/referral/${res.newCode}${tenantSlug ? `?tenant=${tenantSlug}` : ""}`);
            return;
          }
          setUsed(true);
        }
      } catch {
        setValid(false);
      } finally {
        setLoading(false);
      }
    };
    checkCode();
  }, [code, tenantSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!code) return;
    try {
      await apiFetch("/api/estimates", {
        method: "POST",
        body: {
          referralCode: code,
          ...(tenantSlug ? { tenantSlug } : {}),
          ...formData,
          customFields,
        },
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      const status = (err as { status?: number }).status;
      if (status === 400 && message === "This referral link has already been used") {
        setUsed(true);
      }
      setError(message || "Failed to submit estimate. Please try again.");
    }
  };

  if (loading) return <div className="text-center p-10">Loading...</div>;
  if (valid === false) return <div className="text-center p-10 text-red-600 text-xl">Invalid or expired referral link.</div>;
  if (redirecting) return <div className="text-center p-10">Preparing a fresh referral link…</div>;

  return (
    <div className="min-h-screen bg-white px-6 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Request an Estimate</h1>
          <p className="text-lg text-slate-600">Fill out the form below to get started.</p>
        </div>

        {used ? (
          <div className="text-center space-y-6 py-8">
            <h2 className="text-2xl font-bold text-red-600">Link Used</h2>
            <p className="text-slate-600">This referral link has already been used to request an estimate.</p>
          </div>
        ) : submitted ? (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-green-600">Request Submitted!</h2>
            <p className="text-slate-600">Thank you! We will contact you shortly for your estimate.</p>
          </div>
        ) : (
          <EstimateRequestForm
            fieldConfig={referralData?.fieldConfig || []}
            formData={formData}
            setFormData={setFormData}
            customFields={customFields}
            setCustomFields={setCustomFields}
            onSubmit={handleSubmit}
            error={error}
            headerImageUrl={referralData?.tenant?.estimateHeaderImageUrl || null}
            headerImageAlt={`${referralData?.tenant?.name || "Tenant"} estimate header`}
            descriptionRequired
          />
        )}
      </div>
    </div>
  );
}

