"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

type FieldConfig = {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
};

export default function EstimateFieldsPage() {
  const router = useRouter();
  const { logout } = useAuth();

  const [fields, setFields] = useState<FieldConfig[] | null>(null);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldDraft, setFieldDraft] = useState<FieldConfig & { optionsText?: string }>({
    id: "",
    label: "",
    type: "text",
    required: false,
    optionsText: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setFieldsLoading(true);
      try {
        const res = await apiFetch<{ fields: FieldConfig[] | null }>("/api/tenants/fields", {
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        });
        setFields(res?.fields || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load fields";
        toast.error(message);
      } finally {
        setFieldsLoading(false);
      }
    };
    load();
  }, [logout, router]);

  const resetDraft = () =>
    setFieldDraft({
      id: "",
      label: "",
      type: "text",
      required: false,
      optionsText: "",
    });

  const slugifyId = (label: string) =>
    (label || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "";

  const withUniqId = (base: string, existing: string[]) => {
    if (!base) return "";
    let candidate = base;
    let i = 2;
    while (existing.includes(candidate)) {
      candidate = `${base}-${i}`;
      i += 1;
    }
    return candidate;
  };

  const handleAddField = () => {
    const existingIds = (fields || []).map((f) => f.id);
    const autoId = editingId || fieldDraft.id || withUniqId(slugifyId(fieldDraft.label), existingIds);
    if (!autoId || !fieldDraft.label.trim()) {
      toast.message("Enter a label to generate an id");
      return;
    }
    if (fieldDraft.type === "select" && !fieldDraft.optionsText?.trim()) {
      toast.message("Select fields need options");
      return;
    }
    const options =
      fieldDraft.type === "select"
        ? (fieldDraft.optionsText || "")
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean)
        : [];
    const next = (fields || []).filter((f) => f.id !== autoId).concat({
      id: autoId.trim(),
      label: fieldDraft.label.trim(),
      type: fieldDraft.type,
      required: fieldDraft.required,
      options,
    });
    setFields(next);
    resetDraft();
    setEditingId(null);
  };

  const handleRemove = (id: string) => {
    setFields((prev) => (prev || []).filter((f) => f.id !== id));
  };

  const handleEdit = (id: string) => {
    const target = (fields || []).find((f) => f.id === id);
    if (!target) return;
    setEditingId(id);
    setFieldDraft({
      id: target.id,
      label: target.label,
      type: target.type,
      required: Boolean(target.required),
      optionsText: target.options?.join(", ") || "",
    });
  };

  const moveField = (id: string, direction: "up" | "down") => {
    const arr = fields || [];
    const idx = arr.findIndex((f) => f.id === id);
    if (idx === -1) return;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= arr.length) return;
    const next = [...arr];
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    setFields(next);
  };

  const handleSaveFields = async () => {
    try {
      await apiFetch("/api/tenants/fields", {
        method: "PATCH",
        body: { fields: fields || [] },
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      toast.success("Field config saved");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save fields";
      toast.error(message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimate Fields</CardTitle>
        <CardDescription>Manage fields shown on the prospect estimate form.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-600">Create, edit, and remove fields per tenant.</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSaveFields} disabled={fieldsLoading}>
            Save Fields
          </Button>
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3 rounded border bg-slate-50 p-4">
        <h4 className="text-sm font-semibold text-slate-800">
          {editingId ? "Edit Field" : "Add / Replace Field"}
        </h4>
        <div className="space-y-1">
          <Label>Label</Label>
          <Input
            value={fieldDraft.label}
            onChange={(e) =>
              setFieldDraft((d) => {
                const existingIds = (fields || []).map((f) => f.id);
                const autoId = editingId ? editingId : withUniqId(slugifyId(e.target.value), existingIds);
                return { ...d, label: e.target.value, id: autoId };
              })
            }
            placeholder="e.g., Service Type"
          />
        </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={fieldDraft.type} onValueChange={(v) => setFieldDraft((d) => ({ ...d, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="textarea">Textarea</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Required</Label>
                <Select
                  value={fieldDraft.required ? "yes" : "no"}
                  onValueChange={(v) => setFieldDraft((d) => ({ ...d, required: v === "yes" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {fieldDraft.type === "select" && (
              <div className="space-y-1">
            <Label>Options (comma separated)</Label>
                <Input
                  value={fieldDraft.optionsText || ""}
                  onChange={(e) => setFieldDraft((d) => ({ ...d, optionsText: e.target.value }))}
              placeholder="One-time, Recurring"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleAddField} variant="default" size="sm">
                {editingId ? "Update Field" : "Save Field Locally"}
              </Button>
              <Button
                onClick={() => {
                  resetDraft();
                  setEditingId(null);
                }}
                variant="outline"
                size="sm"
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="space-y-3 rounded border bg-white p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800">Current Fields</h4>
              <Badge variant="outline">{fields?.length || 0} fields</Badge>
            </div>
            <div className="space-y-2">
              {(fields || []).map((field) => (
                <div key={field.id} className="flex items-center justify-between rounded border px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold">{field.label}</div>
                    <div className="text-xs text-slate-600">
                      {field.id} · {field.type} {field.required ? "· required" : ""}
                      {field.options?.length ? ` · options: ${field.options.join(", ")}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => moveField(field.id, "up")}>
                      ↑
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => moveField(field.id, "down")}>
                      ↓
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(field.id)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleRemove(field.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              {fieldsLoading && <div className="text-sm text-slate-600">Loading fields…</div>}
              {!fieldsLoading && (fields || []).length === 0 && (
                <div className="text-sm text-slate-600">No custom fields. Using defaults.</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

