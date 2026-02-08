"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

type EmailTemplate = {
  key: string;
  label: string;
  subject: string;
  html: string;
  variables: string[];
  isDefault: boolean;
};

export default function EmailTemplatesPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templateKey, setTemplateKey] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateHtml, setTemplateHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const applyTemplate = (key: string, list: EmailTemplate[]) => {
    const found = list.find((t) => t.key === key) || list[0];
    if (!found) return;
    setTemplateKey(found.key);
    setTemplateSubject(found.subject || "");
    setTemplateHtml(found.html || "");
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ templates: EmailTemplate[] }>("/api/tenants/email-templates", {
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      const list = res?.templates || [];
      setTemplates(list);
      if (list.length > 0) {
        applyTemplate(templateKey || list[0].key, list);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load templates";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleSaveTemplate = async () => {
    if (!templateKey) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ templates: EmailTemplate[] }>(`/api/tenants/email-templates/${templateKey}`, {
        method: "PUT",
        body: JSON.stringify({ subject: templateSubject, html: templateHtml }),
        headers: { "Content-Type": "application/json" },
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      const list = res?.templates || [];
      setTemplates(list);
      applyTemplate(templateKey, list);
      toast.success("Email template saved");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save template";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetTemplate = async () => {
    if (!templateKey) return;
    setResetting(true);
    try {
      const res = await apiFetch<{ templates: EmailTemplate[] }>(`/api/tenants/email-templates/${templateKey}/reset`, {
        method: "POST",
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      const list = res?.templates || [];
      setTemplates(list);
      applyTemplate(templateKey, list);
      toast.success("Template reset to default");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset template";
      toast.error(message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Templates</CardTitle>
        <CardDescription>Customize system emails sent to customers and admins.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-sm text-slate-600">Loading templates…</div>
        ) : templates.length === 0 ? (
          <div className="text-sm text-slate-600">No templates available.</div>
        ) : (
          <>
            <div className="space-y-1">
              <Label>Template</Label>
              <Select value={templateKey} onValueChange={(val) => applyTemplate(val, templates)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Subject</Label>
              <Input value={templateSubject} onChange={(e) => setTemplateSubject(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>HTML Body</Label>
              <Textarea
                value={templateHtml}
                onChange={(e) => setTemplateHtml(e.target.value)}
                className="min-h-[240px]"
              />
            </div>
            <div className="text-xs text-slate-500">
              Available variables:{" "}
              {templates.find((t) => t.key === templateKey)?.variables.join(", ") || "None"}
              <span className="block">Use format: {"{{variableName}}"}</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveTemplate} disabled={saving}>
                {saving ? "Saving..." : "Save template"}
              </Button>
              <Button variant="outline" onClick={handleResetTemplate} disabled={resetting}>
                {resetting ? "Resetting..." : "Reset to default"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
