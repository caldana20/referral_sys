"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

export default function BulkUploadClientsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      toast.message("Please choose a CSV file");
      return;
    }
    const form = new FormData();
    form.append("file", file);
    setUploading(true);
    try {
      const res = await apiFetch<{ message?: string; importedCount?: number; errors?: string[] }>(
        "/api/users/import",
        {
          method: "POST",
          body: form,
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        }
      );
      toast.success(res?.message || "Upload complete");
      router.replace("/admin/clients");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload Clients</CardTitle>
        <CardDescription>Upload a CSV file with columns: name, email, phone (optional).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded border border-dashed bg-slate-50 p-6">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-700"
          />
          {file ? <div className="mt-2 text-sm text-slate-600">Selected: {file.name}</div> : null}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload CSV"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

