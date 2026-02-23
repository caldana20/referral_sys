"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, MoreVertical, Upload, UserPlus, Users } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";
import Link from "next/link";

type Client = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  lastInvitationSentAt?: string | null;
};

type Campaign = { id: number; name: string };
type Group = { id: number; name: string };

const PAGE_SIZE = 10;

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export default function AdminClientsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [links, setLinks] = useState<Record<number, string>>({});
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Client | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [query, setQuery] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteCampaignId, setInviteCampaignId] = useState<string>("none");
  const [inviteIds, setInviteIds] = useState<number[]>([]);
  const [inviteGroupId, setInviteGroupId] = useState<string>("none");
  const [inviteMode, setInviteMode] = useState<"clients" | "group">("clients");
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch<Client[]>("/api/users?role=client", {
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        });
        setClients(Array.isArray(res) ? res : []);

        const campRes = await apiFetch<Campaign[]>("/api/campaigns", {
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        });
        setCampaigns(Array.isArray(campRes) ? campRes : []);

        const groupRes = await apiFetch<Group[]>("/api/groups", {
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        });
        setGroups(Array.isArray(groupRes) ? groupRes : []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load clients";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [logout, router]);

  const toggleSelect = (id: number, checked: boolean | "indeterminate") => {
    setSelected((prev) => ({ ...prev, [id]: checked === "indeterminate" ? false : Boolean(checked) }));
  };

  const filtered = clients.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });
  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );
  const stats = [
    {
      label: "Total clients",
      value: clients.length,
      icon: Users,
    },
    {
      label: "Filtered results",
      value: filtered.length,
      icon: Mail,
    },
    {
      label: "Selected",
      value: selectedCount,
      icon: UserPlus,
    },
  ];

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const handlePageChange = (delta: number) => {
    setPage((p) => {
      const next = p + delta;
      if (next < 1) return 1;
      if (next > totalPages) return totalPages;
      return next;
    });
  };

  const handleGenerateLink = async (clientId: number) => {
    try {
      const res = await apiFetch<{ link: string }>(`/api/users/${clientId}/generate-referral-link`, {
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      if (res?.link) {
        setLinks((prev) => ({ ...prev, [clientId]: res.link }));
        toast.success("Link generated");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate link";
      toast.error(message);
    }
  };

  const handleDelete = async (clientId: number) => {
    try {
      await apiFetch(`/api/users/${clientId}`, {
        method: "DELETE",
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      setClients((prev) => prev.filter((c) => c.id !== clientId));
      toast.success("Client removed");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove client";
      toast.error(message);
    }
  };

  const openInviteDialog = () => {
    const ids = Object.entries(selected)
      .filter(([, val]) => val)
      .map(([id]) => Number(id));
    if (ids.length === 0) {
      setInviteMode("group");
      setInviteGroupId("none");
    } else {
      setInviteMode("clients");
      setInviteIds(ids);
    }
    setInviteCampaignId("none");
    setInviteDialogOpen(true);
  };

  const handleSendInvitations = async () => {
    if (inviteMode === "clients" && inviteIds.length === 0) {
      toast.message("Select at least one client");
      return;
    }
    if (inviteMode === "group" && inviteGroupId === "none") {
      toast.message("Select a group");
      return;
    }
    setInviting(true);
    try {
      const res = await apiFetch<{ sentCount?: number; failedCount?: number; message?: string }>(
        "/api/users/send-invitations",
        {
          method: "POST",
          body: {
            clientIds: inviteMode === "clients" ? inviteIds : [],
            groupId: inviteMode === "group" && inviteGroupId !== "none" ? inviteGroupId : undefined,
            campaignId: inviteCampaignId !== "none" ? inviteCampaignId : undefined,
          },
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        }
      );
      toast.success(res?.message || "Invitations sent");
      setInviteDialogOpen(false);
      setInviteIds([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send invitations";
      toast.error(message);
    } finally {
      setInviting(false);
    }
  };

  const openCreateGroup = () => {
    const ids = Object.entries(selected)
      .filter(([, val]) => val)
      .map(([id]) => Number(id));
    if (ids.length === 0) {
      toast.message("Select at least one client to create a group");
      return;
    }
    setInviteIds(ids);
    setGroupName("");
    setGroupDialogOpen(true);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.message("Group name is required");
      return;
    }
    try {
      const res = await apiFetch<Group>("/api/groups", {
        method: "POST",
        body: { name: groupName.trim(), clientIds: inviteIds },
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      setGroups((prev) => [res, ...prev]);
      setGroupDialogOpen(false);
      toast.success("Group created");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create group";
      toast.error(message);
    }
  };
  const handleUpdate = async (client: Client) => {
    const name = editName.trim();
    const email = editEmail.trim();
    const phone = editPhone.trim();
    if (!name || !email) {
      toast.message("Name and email are required");
      return;
    }
    try {
      const res = await apiFetch<Client>(`/api/users/${client.id}`, {
        method: "PATCH",
        body: { name, email, phone },
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      setClients((prev) => prev.map((c) => (c.id === client.id ? res : c)));
      setEditing(null);
      toast.success("Client updated");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update client";
      toast.error(message);
      setEditing(null);
    }
  };


  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <Badge variant="secondary" className="mb-3 px-3 py-1 text-xs uppercase tracking-[0.25em]">
              Client directory
            </Badge>
            <h1 className="font-display text-3xl text-slate-900">Manage your clients</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Invite clients, generate referral links, and organize groups for targeted campaigns.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/admin/clients/new">
                <UserPlus className="h-4 w-4" />
                Add Client
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/clients/bulk-upload">
                <Upload className="h-4 w-4" />
                Bulk Upload
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={openCreateGroup}>
              Create Group
            </Button>
            <Button variant="outline" size="sm" onClick={openInviteDialog} disabled={inviting || loading}>
              {inviting ? "Sending..." : "Send Invitations"}
            </Button>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="rounded-2xl border-slate-200/70 bg-white">
              <CardContent className="flex items-center justify-between gap-3 pt-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <stat.icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card className="rounded-3xl border-slate-200/70 bg-white">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Clients</CardTitle>
            <CardDescription>Invite clients, generate referral links, and bulk import.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/admin/clients/new">
                <UserPlus className="h-4 w-4" />
                Add Client
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/clients/bulk-upload">
                <Upload className="h-4 w-4" />
                Bulk Upload
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={openCreateGroup}>
              Create Group
            </Button>
            <Button variant="outline" size="sm" onClick={openInviteDialog} disabled={inviting || loading}>
              {inviting ? "Sending..." : "Send Invitations"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Input
              placeholder="Search by name or email"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="max-w-sm"
            />
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <span>{filtered.length} results</span>
              <span className="hidden sm:inline">•</span>
              <span>{selectedCount} selected</span>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Select</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last invitation</TableHead>
                <TableHead className="w-[220px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected[client.id] || false}
                      onCheckedChange={(checked) => toggleSelect(client.id, checked)}
                    />
                  </TableCell>
                  <TableCell>{client.name}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.phone || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-primary/30 text-primary">
                      {client.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(client.lastInvitationSentAt)}</TableCell>
                  <TableCell className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleGenerateLink(client.id)}>
                        Generate Link
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(client);
                              setEditName(client.name || "");
                              setEditEmail(client.email || "");
                              setEditPhone(client.phone || "");
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(client.id)} className="text-red-600">
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {links[client.id] ? (
                      <div className="rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 text-xs text-muted-foreground break-all">
                        {links[client.id]}
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    {loading ? "Loading clients..." : "No clients found."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <div>
              Page {page} of {totalPages} · {clients.length} total
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handlePageChange(-1)} disabled={page === 1}>
                Previous
              </Button>
              <Button size="sm" variant="outline" onClick={() => handlePageChange(1)} disabled={page >= totalPages}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => editing && handleUpdate(editing)} disabled={!editName.trim() || !editEmail.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{inviteMode === "group" ? "Select group and campaign" : "Select a campaign"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {inviteMode === "group" ? (
              <>
                <Label className="text-sm text-slate-700">Group</Label>
                <Select value={inviteGroupId} onValueChange={setInviteGroupId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select group</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : null}
            <Label className="text-sm text-slate-700">Campaign</Label>
            <Select value={inviteCampaignId} onValueChange={setInviteCampaignId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose a campaign to attach to these invitations{inviteMode === "group" ? " and a group." : "."}
            </p>
          </div>
          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvitations} disabled={inviting}>
              {inviting ? "Sending..." : "Send Invitations"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create group</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm text-slate-700">Group name</Label>
            <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="New group name" />
            <p className="text-xs text-muted-foreground">
              This group will include the currently selected clients.
            </p>
          </div>
          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup}>Create Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
