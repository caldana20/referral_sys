 "use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

type Reward = {
  id: number;
  name: string;
  active: boolean;
};

export default function AdminRewardsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newReward, setNewReward] = useState("");

  const loadRewards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<Reward[]>("/api/rewards", {
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      setRewards(Array.isArray(res) ? res : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load rewards";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [logout, router]);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  const handleCreate = async () => {
    if (!newReward.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/api/rewards", {
        method: "POST",
        body: { name: newReward.trim() },
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      setNewReward("");
      await loadRewards();
      toast.success("Reward created");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create reward";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await apiFetch(`/api/rewards/${id}/toggle`, {
        method: "PATCH",
        onUnauthorized: () => {
          logout();
          router.replace("/admin/login");
        },
      });
      await loadRewards();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update reward";
      toast.error(message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rewards</CardTitle>
        <CardDescription>Configure reward tiers and defaults.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            placeholder="New reward name"
            value={newReward}
            onChange={(e) => setNewReward(e.target.value)}
            className="md:w-64"
          />
          <Button onClick={handleCreate} disabled={creating || !newReward.trim()}>
            {creating ? "Adding..." : "Add Reward"}
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[160px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rewards.map((reward) => (
              <TableRow key={reward.id}>
                <TableCell>{reward.name}</TableCell>
                <TableCell>
                  <Badge variant={reward.active ? "outline" : "secondary"}>
                    {reward.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => handleToggle(reward.id)}>
                    Toggle
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rewards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-slate-600">
                  {loading ? "Loading rewards..." : "No rewards yet."}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

