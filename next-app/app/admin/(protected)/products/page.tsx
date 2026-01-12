"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

type Product = {
  id: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  imageMediaId?: number | null;
};

type MediaItem = {
  id: number;
  url: string;
  signedUrl?: string | null;
  filename?: string | null;
  contentType?: string | null;
  size?: number | null;
  createdAt?: string;
};

export default function ProductsPage() {
  const { logout } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", description: "", imageUrl: "", imageMediaId: null as number | null });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<Product[]>("/api/products", {
        onUnauthorized: () => {
          logout();
        },
      });
      setProducts(Array.isArray(res) ? res : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadMedia = async () => {
    setMediaLoading(true);
    try {
      const res = await apiFetch<MediaItem[]>("/api/media", { onUnauthorized: () => logout() });
      setMediaItems(Array.isArray(res) ? res : []);
      setMediaLoaded(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load media");
    } finally {
      setMediaLoading(false);
    }
  };

  const openMediaDialog = () => {
    setMediaDialogOpen(true);
    if (!mediaLoaded) {
      loadMedia();
    }
  };

  const handleSelectMedia = (item: MediaItem) => {
    setForm((prev) => ({
      ...prev,
      imageMediaId: item.id,
      imageUrl: item.url,
    }));
    setMediaDialogOpen(false);
  };

  const clearSelectedMedia = () => {
    setForm((prev) => ({
      ...prev,
      imageMediaId: null,
      imageUrl: "",
    }));
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", imageUrl: "", imageMediaId: null });
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name || "",
      description: p.description || "",
      imageUrl: p.imageUrl || "",
      imageMediaId: p.imageMediaId || null,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const res = await apiFetch<Product>(`/api/products/${editing.id}`, {
          method: "PATCH",
          body: {
            name: form.name.trim(),
            description: form.description.trim(),
            imageUrl: form.imageMediaId ? form.imageUrl : null,
            imageMediaId: form.imageMediaId,
          },
          onUnauthorized: () => logout(),
        });
        setProducts((prev) => prev.map((p) => (p.id === editing.id ? res : p)));
        toast.success("Product updated");
      } else {
        const res = await apiFetch<Product>(`/api/products`, {
          method: "POST",
          body: {
            name: form.name.trim(),
            description: form.description.trim(),
            imageUrl: form.imageMediaId ? form.imageUrl : null,
            imageMediaId: form.imageMediaId,
          },
          onUnauthorized: () => logout(),
        });
        setProducts((prev) => [res, ...prev]);
        toast.success("Product created");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    try {
      await apiFetch(`/api/products/${id}`, { method: "DELETE", onUnauthorized: () => logout() });
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Product deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const selectedMedia = form.imageMediaId ? mediaItems.find((m) => m.id === form.imageMediaId) : null;
  const previewUrl = selectedMedia?.signedUrl || selectedMedia?.url || form.imageUrl;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Products</CardTitle>
          <p className="text-sm text-slate-600">Manage products used by campaigns.</p>
        </div>
        <Button onClick={openNew}>New Product</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Image</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-sm text-slate-700">{p.description || "—"}</TableCell>
                <TableCell className="text-sm text-slate-700 break-all">{p.imageUrl || "—"}</TableCell>
                <TableCell className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => remove(p.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-slate-600">
                  {loading ? "Loading..." : "No products yet."}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Image</Label>
                {form.imageMediaId ? (
                  <span className="text-xs text-slate-600">From media #{form.imageMediaId}</span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" type="button" onClick={openMediaDialog}>
                  Choose from media
                </Button>
                {form.imageMediaId ? (
                  <Button variant="ghost" type="button" onClick={clearSelectedMedia}>
                    Clear
                  </Button>
                ) : null}
              </div>
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Selected" className="h-24 w-24 rounded border object-cover" />
              ) : (
                <p className="text-xs text-slate-500">No image selected. Pick one from Media.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select an image</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between pb-2">
            <div className="text-sm text-slate-600">
              Choose from uploaded media. Refresh if you do not see a recent upload.
            </div>
            <Button variant="outline" size="sm" onClick={loadMedia} disabled={mediaLoading}>
              {mediaLoading ? "Loading..." : "Refresh"}
            </Button>
          </div>
          {mediaLoading ? (
            <div className="text-sm text-slate-600">Loading...</div>
          ) : mediaItems.length === 0 ? (
            <div className="text-sm text-slate-600">No media found. Upload in the Media page.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {mediaItems.map((item) => {
                const preview = item.signedUrl || item.url;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectMedia(item)}
                    className="group rounded border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow"
                  >
                    <div className="aspect-square w-full overflow-hidden border-b bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt={item.filename || "media"} className="h-full w-full object-cover" />
                    </div>
                    <div className="p-2 text-xs text-slate-700">
                      <div className="truncate font-medium" title={item.filename || ""}>
                        {item.filename || "Untitled"}
                      </div>
                      <div className="text-slate-500">{item.contentType || ""}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

