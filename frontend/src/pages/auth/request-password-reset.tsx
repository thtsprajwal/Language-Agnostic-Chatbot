import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiCall } from "@/lib/apiClient";
import { toast } from "sonner";

const RequestPasswordResetPage = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await apiCall("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to request password reset");
      }
      toast.success(data.message || "Password reset email sent");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Password reset request failed";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold mb-2">Forgot password</h1>
        <p className="text-muted-foreground mb-6">Request a reset link for your account.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send reset email"}
          </Button>
        </form>
        <div className="text-sm mt-4 text-center">
          <Link to="/reset-password" className="text-primary hover:underline">
            Already have a token?
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RequestPasswordResetPage;
