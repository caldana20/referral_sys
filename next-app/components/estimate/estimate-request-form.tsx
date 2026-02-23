"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type EstimateFieldConfig = {
  id: string;
  label: string;
  type: "text" | "textarea" | "email" | "number" | "select" | "date" | "checkbox";
  required?: boolean;
  options?: string[];
  span?: 1 | 2;
  placeholder?: string;
  rows?: number;
  helpText?: string;
};

export type EstimateFormData = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  description: string;
  notes: string;
};

type Props = {
  fieldConfig?: EstimateFieldConfig[] | null;
  formData: EstimateFormData;
  setFormData: React.Dispatch<React.SetStateAction<EstimateFormData>>;
  customFields: Record<string, string>;
  setCustomFields: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  error?: string;
  readOnly?: boolean;
  submitLabel?: string;
  descriptionRequired?: boolean;
  hideNotesWhenCustomNotes?: boolean;
  headerImageUrl?: string | null;
  headerImageAlt?: string;
};

function fieldSpanClass(field: EstimateFieldConfig) {
  if (field.span === 2) return "md:col-span-2";
  if (field.type === "textarea") return "md:col-span-2";
  if (field.type === "checkbox") return "md:col-span-2";
  return "md:col-span-1";
}

export function EstimateRequestForm({
  fieldConfig,
  formData,
  setFormData,
  customFields,
  setCustomFields,
  onSubmit,
  error,
  readOnly = false,
  submitLabel = "Submit Request",
  descriptionRequired = true,
  hideNotesWhenCustomNotes = false,
  headerImageUrl = null,
  headerImageAlt = "Estimate form header"
}: Props) {
  const hasCustomNotes = (fieldConfig || []).some((f) => f.id === "notes");

  const renderField = (field: EstimateFieldConfig) => {
    const value = customFields[field.id] ?? "";
    const commonProps = {
      id: field.id,
      name: field.id,
      required: readOnly ? false : field.required,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setCustomFields((prev) => ({ ...prev, [field.id]: e.target.value })),
      placeholder: field.placeholder,
      disabled: readOnly
    };

    switch (field.type) {
      case "textarea":
        return <Textarea {...commonProps} rows={field.rows ?? 3} />;
      case "select":
        return (
          <Select
            value={value}
            onValueChange={(val) => setCustomFields((prev) => ({ ...prev, [field.id]: val }))}
            disabled={readOnly}
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
        return <Input type="date" {...commonProps} className="max-w-xs" />;
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <input
              id={field.id}
              name={field.id}
              type="checkbox"
              checked={value === "true"}
              onChange={(e) => setCustomFields((prev) => ({ ...prev, [field.id]: e.target.checked ? "true" : "false" }))}
              disabled={readOnly}
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
    <>
      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-6">
        {headerImageUrl ? (
          <div className="overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={headerImageUrl} alt={headerImageAlt} className="h-44 w-full object-cover" />
          </div>
        ) : null}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label className="mb-1 block">Full Name</Label>
              <Input
                required={!readOnly}
                name="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-1">
              <Label className="mb-1 block">Email</Label>
              <Input
                required={!readOnly}
                type="email"
                name="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-1">
              <Label className="mb-1 block">Phone</Label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-1">
              <Label className="mb-1 block">Address</Label>
              <Input
                name="address"
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-1">
              <Label className="mb-1 block">City</Label>
              <Input
                name="city"
                value={formData.city}
                onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                disabled={readOnly}
              />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Project</h2>
          <div className="space-y-1">
            <Label className="mb-1 block">Project Description</Label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={4}
              placeholder="Describe your project requirements..."
              required={!readOnly && descriptionRequired}
              disabled={readOnly}
            />
          </div>
        </section>

        {fieldConfig?.length ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Additional Details</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {fieldConfig.map((field) => (
                <div key={field.id} className={`space-y-1 ${fieldSpanClass(field)}`}>
                  <Label htmlFor={field.id}>
                    {field.label} {field.required ? "*" : ""}
                  </Label>
                  {renderField(field)}
                  {field.helpText ? <p className="text-xs text-slate-500">{field.helpText}</p> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {!hideNotesWhenCustomNotes || !hasCustomNotes ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Notes</h2>
            <Textarea
              name="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes"
              rows={3}
              disabled={readOnly}
            />
          </section>
        ) : null}

        <Button type={readOnly ? "button" : "submit"} className="w-full" disabled={readOnly}>
          {readOnly ? "Preview only" : submitLabel}
        </Button>
      </form>
    </>
  );
}
