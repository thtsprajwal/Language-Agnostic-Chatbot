import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Users, Shield, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type Role = "student" | "faculty" | "admin";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await login(email, password, selectedRole, requiresMfa ? mfaCode : undefined);
      const routes: Record<Role, string> = {
        student: "/student",
        faculty: "/faculty",
        admin: "/admin",
      };
      navigate(routes[selectedRole]);
      toast.success("Login successful!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed. Please try again.";
      const requiresMfaChallenge = typeof error === "object" && error !== null && "requiresMfa" in error
        ? Boolean((error as { requiresMfa?: boolean }).requiresMfa)
        : false;

      if (requiresMfaChallenge) {
        setRequiresMfa(true);
        toast.info("Enter your MFA code to complete login.");
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-slide-up">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <GraduationCap className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Campus Intelligence
          </h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-xl p-8 animate-scale-in">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="role">Login as</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as Role)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Student
                    </div>
                  </SelectItem>
                  <SelectItem value="faculty">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Faculty
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Administrator
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="pl-10"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="pl-10"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {requiresMfa && (
              <div className="space-y-2">
                <Label htmlFor="mfa">Authenticator Code</Label>
                <Input
                  id="mfa"
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter 6-digit code"
                  required
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:shadow-glow transition-all"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? "Signing in..." : requiresMfa ? "Verify & Sign In" : "Sign In"}
            </Button>

            <div className="flex items-center justify-between text-sm pt-2">
              <Link to="/request-password-reset" className="text-primary hover:underline">
                Forgot password?
              </Link>
              <Link to="/register" className="text-primary hover:underline">
                Create account
              </Link>
            </div>

            <div className="text-sm text-center text-muted-foreground">
              Need to verify your account? {" "}
              <Link to="/request-email-verification" className="text-primary hover:underline">
                Verify email
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
