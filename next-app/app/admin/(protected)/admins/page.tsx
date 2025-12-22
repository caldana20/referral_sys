"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

type AdminUser = {
  id: number;
  name?: string;
  email: string;
  role: string;
};

export default function AdminUsersPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch<AdminUser[]>("/api/users?role=admin", {
          onUnauthorized: () => {
            logout();
            router.replace("/admin/login");
          },
        });
        setAdmins(Array.isArray(res) ? res : []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load admins";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [logout, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admins</CardTitle>
        <CardDescription>List of admin users for this tenant.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell>{admin.name || "—"}</TableCell>
                <TableCell>{admin.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{admin.role}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {admins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-slate-600">
                  {loading ? "Loading admins..." : "No admins found."}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

