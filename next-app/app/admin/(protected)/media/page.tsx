"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

type MediaItem = {
  id: number;
  url: string;
  signedUrl?: string | null;
  filename?: string | null;
  contentType?: string | null;
  size?: number | null;
  createdAt?: string;
};

export default function MediaPage() {
  const { logout } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<MediaItem[]>("/api/media", {
        onUnauthorized: () => logout(),
      });
      setItems(Array.isArray(res) ? res : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load media");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Choose a file to upload");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploaded = await apiFetch<MediaItem>("/api/media", {
        method: "POST",
        body: formData,
        onUnauthorized: () => logout(),
      });
      setItems((prev) => [uploaded, ...prev]);
      setFile(null);
      toast.success("Uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this image?")) return;
    try {
      await apiFetch(`/api/media/${id}`, { method: "DELETE", onUnauthorized: () => logout() });
      setItems((prev) => prev.filter((m) => m.id !== id));
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tenant Media</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="file"
            accept="image/*"
            className="sm:max-w-xs"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gallery</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-600">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-slate-600">No images yet.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {items.map((item) => {
                const preview = item.signedUrl || item.url;
                const sizeKb = item.size ? Math.round(item.size / 1024) : null;
                return (
                  <div key={item.id} className="rounded border bg-white shadow-sm">
                    <div className="aspect-square w-full overflow-hidden border-b bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt={item.filename || "media"} className="h-full w-full object-cover" />
                    </div>
                    <div className="space-y-1 p-3 text-sm text-slate-700">
                      <div className="font-medium truncate" title={item.filename || ""}>
                        {item.filename || "Untitled"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.contentType || "image"} {sizeKb ? `· ${sizeKb} KB` : ""}
                      </div>
                      {item.createdAt ? (
                        <div className="text-xs text-slate-500">
                          Added {new Date(item.createdAt).toLocaleString()}
                        </div>
                      ) : null}
                      <div className="flex gap-2 pt-1">
                        <Button asChild variant="outline" size="sm" className="w-full">
                          <a href={preview} target="_blank" rel="noreferrer">
                            View
                          </a>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
