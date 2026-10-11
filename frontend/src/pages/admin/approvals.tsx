import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiCall } from "@/lib/apiClient";

interface PendingUser {
  id: string;
  email: string;
  role: "student" | "faculty" | "admin";
  approvalStatus: "pending" | "rejected";
  createdAt: string;
}

const AdminApprovals = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiCall("/api/auth/admin/pending-users", { method: "GET" });
      if (!response.ok) {
        throw new Error("Failed to load pending approvals");
      }

      const data = (await response.json()) as { users?: PendingUser[] };
      setUsers(data.users ?? []);
    } catch (error) {
      console.error(error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const updateApproval = async (userId: string, approvalStatus: "approved" | "rejected") => {
    setIsUpdating(userId);
    try {
      const response = await apiCall(`/api/auth/admin/users/${userId}/${approvalStatus === "approved" ? "approve" : "reject"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ approvalStatus }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message || "Unable to update the approval state.");
      }

      await loadUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update approval.";
      alert(message);
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b border-border bg-card flex items-center px-6 sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
        <h1 className="ml-6 text-xl font-semibold text-foreground">Role approval queue</h1>
      </header>

      <main className="p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Pending approvals</h2>
                <p className="text-sm text-muted-foreground">Review new faculty and admin access requests.</p>
              </div>
            </div>

            {isLoading ? (
              <p className="text-muted-foreground">Loading approvals...</p>
            ) : users.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
                No pending or rejected users.
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex flex-col gap-4 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{user.email}</p>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="capitalize">{user.role}</span>
                        <span>•</span>
                        <span className="capitalize">{user.approvalStatus}</span>
                        <span>•</span>
                        <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => updateApproval(user.id, "approved")}
                        disabled={isUpdating === user.id}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        {isUpdating === user.id ? "Updating..." : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateApproval(user.id, "rejected")}
                        disabled={isUpdating === user.id}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminApprovals;
