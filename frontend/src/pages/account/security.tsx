import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiCall } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type Session = {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
};

const SecuritySettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [isMfaBusy, setIsMfaBusy] = useState(false);
  const [isSessionsBusy, setIsSessionsBusy] = useState(false);

  const loadSessions = async () => {
    setIsSessionsBusy(true);
    try {
      const response = await apiCall("/api/auth/sessions");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load sessions");
      }
      setSessions(data.sessions || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load sessions";
      toast.error(message);
    } finally {
      setIsSessionsBusy(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  const handleStartMfaSetup = async () => {
    setIsMfaBusy(true);
    try {
      const response = await apiCall("/api/auth/mfa/setup", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to start MFA setup");
      }
      setMfaQrCode(data.qrCode || null);
      setMfaSecret(data.secret || null);
      toast.success("Scan the QR code and verify with your authenticator app.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "MFA setup failed";
      toast.error(message);
    } finally {
      setIsMfaBusy(false);
    }
  };

  const handleVerifyMfa = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsMfaBusy(true);
    try {
      const response = await apiCall("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: mfaCode }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to verify MFA");
      }
      toast.success(data.message || "MFA enabled");
      setMfaCode("");
      setMfaQrCode(null);
      setMfaSecret(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "MFA verification failed";
      toast.error(message);
    } finally {
      setIsMfaBusy(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const response = await apiCall(`/api/auth/sessions/revoke/${sessionId}`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to revoke session");
      }
      toast.success(data.message || "Session revoked");
      await loadSessions();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to revoke session";
      toast.error(message);
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      const response = await apiCall("/api/auth/sessions/revoke-all", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to revoke all sessions");
      }
      toast.success(data.message || "All sessions revoked");
      await loadSessions();
      navigate("/login", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to revoke all sessions";
      toast.error(message);
    }
  };

  const userInfo = {
    name: user?.email || "User",
    role: user?.role || "account",
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Security Settings" userInfo={userInfo} />
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Multi-factor authentication</h2>
          <p className="text-muted-foreground">
            Add an authenticator app as a second factor for login.
          </p>
          <Button onClick={handleStartMfaSetup} disabled={isMfaBusy}>
            {isMfaBusy ? "Preparing..." : "Start MFA setup"}
          </Button>
          {mfaQrCode && (
            <div className="space-y-4">
              <img src={mfaQrCode} alt="MFA QR code" className="w-48 h-48 border rounded-lg" />
              {mfaSecret && <p className="text-sm text-muted-foreground">Backup secret: {mfaSecret}</p>}
              <form onSubmit={handleVerifyMfa} className="space-y-3 max-w-sm">
                <Label htmlFor="mfaCode">Enter code from authenticator app</Label>
                <Input
                  id="mfaCode"
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                  required
                />
                <Button type="submit" disabled={isMfaBusy}>
                  {isMfaBusy ? "Verifying..." : "Verify and enable MFA"}
                </Button>
              </form>
            </div>
          )}
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Active sessions</h2>
            <Button variant="outline" onClick={loadSessions} disabled={isSessionsBusy}>
              Refresh
            </Button>
          </div>
          <p className="text-muted-foreground">
            Revoke any session you do not recognize.
          </p>
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="border border-border rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{session.userAgent || "Unknown device"}</p>
                  <p className="text-muted-foreground">IP: {session.ipAddress || "Unknown"}</p>
                  <p className="text-muted-foreground">{new Date(session.createdAt).toLocaleString()}</p>
                </div>
                <Button variant="destructive" onClick={() => void handleRevokeSession(session.id)}>
                  Revoke
                </Button>
              </div>
            ))}
            {sessions.length === 0 && !isSessionsBusy && (
              <p className="text-sm text-muted-foreground">No active sessions found.</p>
            )}
          </div>
          <Button variant="destructive" onClick={() => void handleRevokeAllSessions()}>
            Revoke all sessions
          </Button>
        </section>
      </main>
    </div>
  );
};

export default SecuritySettingsPage;
