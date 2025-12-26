 "use client";

import { useEffect, useState } from "react";
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
import { MoreVertical } from "lucide-react";
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
};

const PAGE_SIZE = 10;

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

  const totalPages = Math.max(1, Math.ceil(clients.length / PAGE_SIZE));
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

  const handleSendInvitations = async () => {
    const ids = Object.entries(selected)
      .filter(([, val]) => val)
      .map(([id]) => Number(id));
    if (ids.length === 0) {
      toast.message("Select at least one client");
      return;
    }
    setInviting(true);
    try {
      const res = await apiFetch<{ sentCount?: number; failedCount?: number; message?: string }>(
        "/api/users/send-invitations",
        {
          method: "POST",
          body: { clientIds: ids },
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        }
      );
      toast.success(res?.message || "Invitations sent");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send invitations";
      toast.error(message);
    } finally {
      setInviting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Clients</CardTitle>
            <CardDescription>Invite clients, generate referral links, and bulk import.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href="/admin/clients/new">Add Client</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/clients/bulk-upload">Bulk Upload (.csv)</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleSendInvitations} disabled={inviting || loading}>
              {inviting ? "Sending..." : "Send Invitations"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Select</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[220px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((client) => (
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
                    <Badge variant="outline">{client.role}</Badge>
                  </TableCell>
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
                      <div className="text-xs text-slate-600 break-all">{links[client.id]}</div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-slate-600">
                    {loading ? "Loading clients..." : "No clients found."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
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
    </>
  );
}

