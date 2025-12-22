"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";

type FieldConfig = {
  id: string;
  label: string;
  type: "text" | "textarea" | "email" | "number" | "select" | "date" | "checkbox";
  required?: boolean;
  options?: string[];
};

type ReferralResponse = {
  code: string;
  used?: boolean;
  fieldConfig?: FieldConfig[];
  tenant?: { name?: string; logoUrl?: string | null };
};

export default function ReferralLandingPage() {
  const { code, tenant } = useParams<{ code: string; tenant: string }>();

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
  });
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const tenantSlug = useMemo(() => tenant, [tenant]);

  useEffect(() => {
    const checkCode = async () => {
      try {
        if (!tenantSlug || !code) {
          setValid(false);
          return;
        }
        const res = await apiFetch<ReferralResponse>(`/api/referrals/code/${code}?tenantSlug=${tenantSlug}`);
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
        if (res.used) setUsed(true);
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
    if (!tenantSlug || !code) return;
    try {
      await apiFetch("/api/estimates", {
        method: "POST",
        body: {
          referralCode: code,
          tenantSlug,
          ...formData,
          customFields,
        },
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      // apiFetch throws an object with status/message; handle accordingly
      const status = (err as { status?: number }).status;
      if (status === 400 && message === "This referral link has already been used") {
        setUsed(true);
      }
      setError(message || "Failed to submit estimate. Please try again.");
    }
  };

  if (loading) return <div className="text-center p-10">Loading...</div>;
  if (valid === false) return <div className="text-center p-10 text-red-600 text-xl">Invalid or expired referral link.</div>;

  const renderField = (field: FieldConfig) => {
    const value = customFields[field.id] ?? "";
    const commonProps = {
      id: field.id,
      name: field.id,
      required: field.required,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setCustomFields({ ...customFields, [field.id]: e.target.value }),
    };
    switch (field.type) {
      case "textarea":
        return <Textarea {...commonProps} />;
      case "select":
        return (
          <Select
            value={value}
            onValueChange={(val) => setCustomFields({ ...customFields, [field.id]: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "date":
        return <Input type="date" {...commonProps} />;
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <input
              id={field.id}
              name={field.id}
              type="checkbox"
              checked={value === "true"}
              onChange={(e) => setCustomFields({ ...customFields, [field.id]: e.target.checked ? "true" : "false" })}
            />
            <Label htmlFor={field.id} className="text-sm font-normal">
              {field.label}
            </Label>
          </div>
        );
      case "email":
        return <Input type="email" {...commonProps} />;
      case "number":
        return <Input type="number" {...commonProps} />;
      default:
        return <Input type="text" {...commonProps} />;
    }
  };

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
          <>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="mb-1 block">Full Name</Label>
                <Input
                  required
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">Email</Label>
                  <Input
                    required
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Phone</Label>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">Address</Label>
                  <Input
                    name="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="mb-1 block">City</Label>
                  <Input
                    name="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1 block">Project Description</Label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {referralData?.fieldConfig?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {referralData.fieldConfig.map((field) => (
                    <div key={field.id} className="space-y-1">
                      <Label htmlFor={field.id}>{field.label}</Label>
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              ) : null}

              <Button type="submit" className="w-full">
                Submit Request
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

