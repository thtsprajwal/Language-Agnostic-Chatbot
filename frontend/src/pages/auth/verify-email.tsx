import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiCall } from "@/lib/apiClient";
import { toast } from "sonner";

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await apiCall("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to verify email");
      }
      toast.success(data.message || "Email verified successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email verification failed";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold mb-2">Complete email verification</h1>
        <p className="text-muted-foreground mb-6">Paste your verification token from the email.</p>
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Verification token</Label>
            <Input
              id="token"
              required
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Verifying..." : "Verify email"}
          </Button>
        </form>
        <div className="text-sm mt-4 text-center">
          <Link to="/login" className="text-primary hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
