"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

type Product = { id: number; name: string };
type Reward = { id: number; name: string };
type Campaign = {
  id: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  productId?: number | null;
  CampaignRewards?: Array<{ rewardSettingId: number }>;
};

export default function CampaignsPage() {
  const { logout } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
    productId: "none",
    rewardIds: [] as number[],
  });

  const load = async () => {
    setLoading(true);
    try {
      const [campRes, prodRes, rewardRes] = await Promise.all([
        apiFetch<Campaign[]>("/api/campaigns", { onUnauthorized: () => logout() }),
        apiFetch<Product[]>("/api/products", { onUnauthorized: () => logout() }),
        apiFetch<Reward[]>("/api/rewards", { onUnauthorized: () => logout() }),
      ]);
      setCampaigns(Array.isArray(campRes) ? campRes : []);
      setProducts(Array.isArray(prodRes) ? prodRes : []);
      setRewards(Array.isArray(rewardRes) ? rewardRes : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", imageUrl: "", productId: "none", rewardIds: [] });
    setDialogOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      name: c.name || "",
      description: c.description || "",
      imageUrl: c.imageUrl || "",
      productId: c.productId ? String(c.productId) : "none",
      rewardIds: (c.CampaignRewards || []).map((cr) => Number(cr.rewardSettingId)),
    });
    setDialogOpen(true);
  };

  const toggleReward = (id: number, checked: boolean | "indeterminate") => {
    setForm((prev) => {
      const set = new Set(prev.rewardIds);
      if (checked) set.add(id);
      else set.delete(id);
      return { ...prev, rewardIds: Array.from(set) };
    });
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
    const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
      productId: form.productId && form.productId !== "none" ? Number(form.productId) : null,
        rewardIds: form.rewardIds,
      };
      if (editing) {
        await apiFetch<Campaign>(`/api/campaigns/${editing.id}`, {
          method: "PATCH",
          body: payload,
          onUnauthorized: () => logout(),
        });
        toast.success("Campaign updated");
      } else {
        await apiFetch<Campaign>(`/api/campaigns`, {
          method: "POST",
          body: payload,
          onUnauthorized: () => logout(),
        });
        toast.success("Campaign created");
      }
      await load();
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this campaign?")) return;
    try {
      await apiFetch(`/api/campaigns/${id}`, { method: "DELETE", onUnauthorized: () => logout() });
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      toast.success("Campaign deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const productMap = useMemo(() => {
    const map: Record<number, string> = {};
    products.forEach((p) => (map[p.id] = p.name));
    return map;
  }, [products]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Campaigns</CardTitle>
          <p className="text-sm text-slate-600">Manage campaigns and linked rewards/products.</p>
        </div>
        <Button onClick={openNew}>New Campaign</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Rewards</TableHead>
              <TableHead>Image</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-sm text-slate-700">{c.productId ? productMap[c.productId] || "—" : "—"}</TableCell>
                <TableCell className="text-sm text-slate-700">
                  {(c.CampaignRewards || []).length > 0
                    ? (c.CampaignRewards || []).map((cr) => rewards.find((r) => r.id === cr.rewardSettingId)?.name || cr.rewardSettingId).join(", ")
                    : "—"}
                </TableCell>
                <TableCell className="text-sm text-slate-700 break-all">{c.imageUrl || "—"}</TableCell>
                <TableCell className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => remove(c.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-slate-600">
                  {loading ? "Loading..." : "No campaigns yet."}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Campaign" : "New Campaign"}</DialogTitle>
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
            <div className="space-y-1">
              <Label>Image URL</Label>
              <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Product (optional)</Label>
              <Select
                value={form.productId}
                onValueChange={(val) => setForm({ ...form, productId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Allowed Rewards (subset)</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {rewards.map((r) => {
                  const checked = form.rewardIds.includes(r.id);
                  return (
                    <label key={r.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={checked} onCheckedChange={(c) => toggleReward(r.id, Boolean(c))} />
                      <span>{r.name}</span>
                    </label>
                  );
                })}
                {rewards.length === 0 ? <div className="text-xs text-slate-500">No rewards configured.</div> : null}
              </div>
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
    </Card>
  );
}

