"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

type Client = {
  id: number;
  name: string;
  email: string;
};

type Group = {
  id: number;
  name: string;
  memberCount?: number;
  memberIds?: number[];
};

export default function GroupsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [groupRes, clientRes] = await Promise.all([
        apiFetch<Group[]>("/api/groups", {
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        }),
        apiFetch<Client[]>("/api/users?role=client", {
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        }),
      ]);
      setGroups(Array.isArray(groupRes) ? groupRes : []);
      setClients(Array.isArray(clientRes) ? clientRes : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredClients = useMemo(() => {
    if (!query.trim()) return clients;
    const q = query.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }, [clients, query]);

  const openNew = () => {
    setEditing(null);
    setGroupName("");
    setSelectedMembers({});
    setDialogOpen(true);
  };

  const openEdit = async (group: Group) => {
    setEditing(group);
    setGroupName(group.name);
    try {
      const res = await apiFetch<Group>(`/api/groups/${group.id}`, {
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      const memberIds = res.memberIds || [];
      const nextSelected: Record<number, boolean> = {};
      memberIds.forEach((id) => {
        nextSelected[id] = true;
      });
      setSelectedMembers(nextSelected);
      setDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load group");
    }
  };

  const toggleMember = (id: number, checked: boolean | "indeterminate") => {
    setSelectedMembers((prev) => ({ ...prev, [id]: checked === "indeterminate" ? false : Boolean(checked) }));
  };

  const handleSave = async () => {
    if (!groupName.trim()) {
      toast.message("Group name is required");
      return;
    }
    const memberIds = Object.entries(selectedMembers)
      .filter(([, val]) => val)
      .map(([id]) => Number(id));

    setSaving(true);
    try {
      if (editing) {
        const res = await apiFetch<Group>(`/api/groups/${editing.id}`, {
          method: "PATCH",
          body: { name: groupName.trim(), clientIds: memberIds },
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        });
        setGroups((prev) =>
          prev.map((g) => (g.id === editing.id ? { ...g, name: res.name, memberCount: memberIds.length } : g))
        );
        toast.success("Group updated");
      } else {
        const res = await apiFetch<Group>("/api/groups", {
          method: "POST",
          body: { name: groupName.trim(), clientIds: memberIds },
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        });
        setGroups((prev) => [{ ...res, memberCount: memberIds.length }, ...prev]);
        toast.success("Group created");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save group");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (group: Group) => {
    if (!confirm(`Delete group "${group.name}"?`)) return;
    try {
      await apiFetch(`/api/groups/${group.id}`, {
        method: "DELETE",
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      toast.success("Group deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete group");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Groups</CardTitle>
          <CardDescription>Manage groups of clients for invitations.</CardDescription>
        </div>
        <Button onClick={openNew}>New Group</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-slate-600">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="text-sm text-slate-600">No groups yet.</div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex flex-col gap-2 rounded border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-slate-900">{group.name}</div>
                  <div className="text-sm text-slate-600">{group.memberCount ?? 0} members</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(group)}>
                    Edit Members
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(group)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Group" : "New Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Group Name</Label>
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Members</Label>
              <Input
                placeholder="Search clients by name or email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="max-h-64 space-y-2 overflow-y-auto rounded border p-3">
                {filteredClients.map((client) => (
                  <label key={client.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <Checkbox
                      checked={selectedMembers[client.id] || false}
                      onCheckedChange={(checked) => toggleMember(client.id, checked)}
                    />
                    <span className="font-medium">{client.name}</span>
                    <span className="text-slate-500">{client.email}</span>
                  </label>
                ))}
                {filteredClients.length === 0 ? (
                  <div className="text-sm text-slate-500">No matching clients.</div>
                ) : null}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
