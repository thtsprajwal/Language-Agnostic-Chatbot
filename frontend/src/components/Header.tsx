import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, ChevronDown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import ProfileModal from "./ProfileModal";

interface HeaderProps {
  title: string;
  userInfo?: {
    name: string;
    role: string;
    class?: string;
    department?: string;
    rollNumber?: string;
  };
}

const Header = ({ title, userInfo }: HeaderProps) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>

        {userInfo && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-sm font-medium">{userInfo.name}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowProfileModal(true)}>
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowProfileModal(true)}>
                Change Password
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/account/security")}>
                Security Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {userInfo && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          userInfo={userInfo}
        />
      )}
    </>
  );
};

export default Header;
