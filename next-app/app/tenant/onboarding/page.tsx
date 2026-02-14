"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CircleCheck, CircleUserRound, Settings, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { setToken, setUser, type AuthUser } from "@/lib/auth-store";

type Country = { code: string; name: string };
type StateType = { code: string; name: string };

type PreviewResponse = { slug: string; clientUrl: string };
type ConfirmResponse = {
  tenant?: { slug?: string; clientUrl?: string };
  admin?: { email?: string };
};
const steps = [
  { id: 1, title: "Company Info", description: "Business basics and contact", icon: Building2 },
  { id: 2, title: "Admin Account", description: "Create your admin login", icon: CircleUserRound },
  { id: 3, title: "Settings", description: "Review referral defaults", icon: Settings },
  { id: 4, title: "Confirm", description: "Finalize and launch", icon: CircleCheck },
];

export default function TenantOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result, setResult] = useState<ConfirmResponse | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<StateType[]>([]);
  const [company, setCompany] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });
  const [admin, setAdmin] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  // Deprecated: tenant-specific sendgrid settings removed
  const progress = Math.round((step / steps.length) * 100);

  const missingRequired = useMemo(() => {
    const missing: string[] = [];
    if (!company.name.trim()) missing.push("companyName");
    if (!company.email.trim()) missing.push("companyEmail");
    if (!admin.email.trim()) missing.push("adminEmail");
    if (!admin.password.trim()) missing.push("adminPassword");
    if (!admin.confirmPassword.trim()) missing.push("adminPasswordConfirm");
    return missing;
  }, [company.name, company.email, admin.email, admin.password, admin.confirmPassword]);

  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

  const nextStep = () => setStep((s) => Math.min(s + 1, steps.length));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const validateStep1 = () => {
    if (!company.name.trim()) {
      setError("companyName is required");
      return false;
    }
    if (!company.email.trim()) {
      setError("companyEmail is required");
      return false;
    }
    if (!isValidEmail(company.email)) {
      setError("companyEmail is invalid");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!admin.email.trim()) {
      setError("adminEmail is required");
      return false;
    }
    if (!isValidEmail(admin.email)) {
      setError("adminEmail is invalid");
      return false;
    }
    if (!admin.password.trim()) {
      setError("adminPassword is required");
      return false;
    }
    if (admin.password.length < 6) {
      setError("adminPassword must be at least 6 characters");
      return false;
    }
    if (!admin.confirmPassword.trim()) {
      setError("adminPasswordConfirm is required");
      return false;
    }
    if (admin.password !== admin.confirmPassword) {
      setError("adminPassword and confirmation must match");
      return false;
    }
    return true;
  };

  const ensureReadyForConfirm = () => {
    if (missingRequired.length > 0) {
      setError(`${missingRequired.join(", ")} ${missingRequired.length === 1 ? "is" : "are"} required`);
      return false;
    }
    return true;
  };

  const loginAsNewAdmin = async () => {
    try {
      const res = await apiFetch<{ token: string; user: AuthUser }>("/api/auth/login", {
        method: "POST",
        body: { email: admin.email, password: admin.password },
      });
      if (res?.token && res?.user) {
        setToken(res.token);
        setUser(res.user);
      }
    } catch (err) {
      console.error("Auto-login after onboarding failed", err);
    }
  };


  const handlePreview = async () => {
    if (!validateStep1()) return;
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch<PreviewResponse>("/api/tenants/preview", {
        method: "POST",
        body: { companyName: company.name.trim() },
      });
      setPreview(res);
      nextStep();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to preview tenant";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!ensureReadyForConfirm()) return;
    if (!preview) {
      setError("Please complete preview first.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await apiFetch<ConfirmResponse>("/api/tenants/confirm", {
        method: "POST",
        body: {
          trimmedName: company.name.trim(),
          phone: company.phone,
          email: company.email,
          address: company.address,
          city: company.city,
          state: company.state,
          zip: company.zip,
          country: company.country,
          adminEmail: admin.email,
          adminPassword: admin.password,
          sendgridFromEmail: undefined,
          tenantSlug: preview?.slug,
        },
      });
      setResult(res);
      await loginAsNewAdmin();
      if (res?.tenant?.slug) {
        const slug = res.tenant.slug;
        // Redirect to host-based admin login
        router.push(`https://${slug}.tenant.refoza.com/admin/login`);
      } else {
        nextStep();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create tenant";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadCountries = async () => {
      setGeoLoading(true);
      try {
        const res = await apiFetch<Country[]>("/api/meta/countries");
        setCountries(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error("Failed to load countries", err);
      } finally {
        setGeoLoading(false);
      }
    };
    loadCountries();
  }, []);

  useEffect(() => {
    const loadStates = async () => {
      if (!company.country) {
        setStates([]);
        setCompany((c) => ({ ...c, state: "" }));
        return;
      }
      setGeoLoading(true);
      try {
        const res = await apiFetch<StateType[]>(`/api/meta/countries/${company.country}/states`);
        setStates(Array.isArray(res) ? res : []);
        setCompany((c) => ({ ...c, state: "" }));
      } catch (err) {
        console.error("Failed to load states", err);
        setStates([]);
        setCompany((c) => ({ ...c, state: "" }));
      } finally {
        setGeoLoading(false);
      }
    };
    loadStates();
  }, [company.country]);

  // Removed post-confirm steps; no-op

  const StepIndicator = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <span>
          Step {step} of {steps.length}
        </span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200/70">
        <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );

  const StepList = () => (
    <div className="space-y-3">
      {steps.map((s) => {
        const isActive = s.id === step;
        const isComplete = s.id < step;
        return (
          <div
            key={s.id}
            className={cn(
              "flex items-start gap-3 rounded-2xl border px-4 py-3",
              isActive ? "border-primary/30 bg-primary/5" : "border-slate-200/70 bg-white"
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-2xl",
                isActive && "bg-primary text-primary-foreground",
                isComplete && !isActive && "bg-emerald-100 text-emerald-600",
                !isComplete && !isActive && "bg-slate-100 text-slate-500"
              )}
            >
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Company Name</Label>
                <Input
                  value={company.name}
                  onChange={(e) => {
                    setError("");
                    setCompany({ ...company, name: e.target.value });
                  }}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Company Email</Label>
                <Input
                  type="email"
                  value={company.email}
                  onChange={(e) => {
                    setError("");
                    setCompany({ ...company, email: e.target.value });
                  }}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  value={company.phone}
                  onChange={(e) => {
                    setError("");
                    setCompany({ ...company, phone: e.target.value });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>Address</Label>
                <Input
                  value={company.address}
                  onChange={(e) => {
                    setError("");
                    setCompany({ ...company, address: e.target.value });
                  }}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <Label>City</Label>
                <Input
                  value={company.city}
                  onChange={(e) => {
                    setError("");
                    setCompany({ ...company, city: e.target.value });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>Country</Label>
                <Select
                  value={company.country}
                  onValueChange={(val) => {
                    setError("");
                    setCompany({ ...company, country: val });
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
                <Label>State</Label>
                {states.length > 0 ? (
                  <Select
                    value={company.state}
                    onValueChange={(val) => {
                      setError("");
                      setCompany({ ...company, state: val });
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
                    value={company.state}
                    onChange={(e) => {
                      setError("");
                      setCompany({ ...company, state: e.target.value });
                    }}
                    placeholder="State / Province"
                    disabled={geoLoading}
                  />
                )}
              </div>
              <div className="space-y-1 md:col-span-1">
                <Label>Zip</Label>
                <Input
                  value={company.zip}
                  onChange={(e) => {
                    setError("");
                    setCompany({ ...company, zip: e.target.value });
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handlePreview} disabled={loading}>
                {loading ? "Checking..." : "Next"}
              </Button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Admin Email</Label>
              <Input
                type="email"
                value={admin.email}
                onChange={(e) => {
                  setError("");
                  setAdmin({ ...admin, email: e.target.value });
                }}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Admin Password</Label>
              <Input
                type="password"
                value={admin.password}
                onChange={(e) => {
                  setError("");
                  setAdmin({ ...admin, password: e.target.value });
                }}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={admin.confirmPassword}
                onChange={(e) => {
                  setError("");
                  setAdmin({ ...admin, confirmPassword: e.target.value });
                }}
                required
              />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
              <Button
                onClick={() => {
                  if (!validateStep2()) return;
                  setError("");
                  setStep(3);
                }}
                disabled={loading}
              >
                Next
              </Button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>SendGrid From Email</Label>
              <Input
                type="email"
                value=""
                disabled
                placeholder="Configured by system"
              />
            </div>
            {preview && (
              <Card className="rounded-2xl border-slate-200/70 bg-white">
                <CardHeader>
                  <CardTitle className="text-base">Preview</CardTitle>
                  <CardDescription>Tenant slug and client URL from preview response.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-slate-700">
                  <div>
                    <span className="font-medium">Tenant Slug: </span>
                    {preview.slug}
                  </div>
                  <div>
                    <span className="font-medium">Client URL: </span>
                    {preview.clientUrl}
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
              <Button
                onClick={() => {
                  if (!ensureReadyForConfirm()) return;
                  setError("");
                  setStep(4);
                }}
                disabled={loading || !preview || missingRequired.length > 0}
              >
                Next
              </Button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <Card className="rounded-2xl border-slate-200/70 bg-white">
              <CardHeader>
                <CardTitle className="text-base">Confirm</CardTitle>
                <CardDescription>Review details before creating the tenant.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-slate-700">
                <div>
                  <span className="font-medium">Company: </span>
                  {company.name}
                </div>
                <div>
                  <span className="font-medium">Admin: </span>
                  {admin.email}
                </div>
                <div>
                  <span className="font-medium">SendGrid From: </span>
                  {"(not set)"}
                </div>
                {preview && (
                  <>
                    <div>
                      <span className="font-medium">Tenant Slug: </span>
                      {preview.slug}
                    </div>
                    <div>
                      <span className="font-medium">Client URL: </span>
                      {preview.clientUrl}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {result && (
              <Alert className="border-emerald-200/70 bg-emerald-50/80">
                <AlertTitle>Tenant created successfully</AlertTitle>
                <AlertDescription className="space-y-1 text-slate-800">
                  <div>
                    <span className="font-medium">Slug: </span>
                    {result.tenant?.slug}
                  </div>
                  <div>
                    <span className="font-medium">Client URL: </span>
                    {result.tenant?.clientUrl}
                  </div>
                  <div>
                    <span className="font-medium">Admin Email: </span>
                    {result.admin?.email}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {missingRequired.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Missing required fields</AlertTitle>
                <AlertDescription>
                  Please fill company name, company email, admin email, and admin password before confirming.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={loading || !!result || missingRequired.length > 0 || !preview}
              >
                {loading ? "Creating..." : "Confirm & Create"}
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm">
          <Badge variant="secondary" className="mb-4 gap-2 px-3 py-1 text-xs uppercase tracking-[0.25em]">
            <Sparkles className="h-3.5 w-3.5" />
            Tenant Onboarding
          </Badge>
          <h1 className="font-display text-3xl text-slate-900 sm:text-4xl">
            Launch your referral program with clarity.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Complete company details, create your admin login, and confirm the settings that power your referral flow.
          </p>
          <div className="mt-6">
            <StepList />
          </div>
          <div className="mt-6 rounded-2xl bg-slate-900 px-4 py-4 text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Need help?</p>
            <p className="mt-2 text-sm text-slate-200">
              We automatically configure the core referral infrastructure. You can fine-tune campaigns after launch.
            </p>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/70 bg-white px-5 py-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current step</p>
                <h2 className="font-display text-2xl text-slate-900">
                  Step {step} of {steps.length}: {steps[step - 1].title}
                </h2>
                <p className="text-sm text-muted-foreground">{steps[step - 1].description}</p>
              </div>
              <Badge variant="secondary" className="px-3 py-1 text-xs uppercase tracking-[0.2em]">
                Est. 10 min
              </Badge>
            </div>
            <div className="mt-4">
              <StepIndicator />
            </div>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Card className="rounded-3xl border-slate-200/70 bg-white">
            <CardContent className="pt-6">{renderStep()}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
