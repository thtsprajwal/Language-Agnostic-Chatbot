import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Card from "@/components/Card";
import DocumentUpload from "@/components/DocumentUpload";
import { Bot, BarChart3, Users, Shield, Settings, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const userInfo = {
    name: "Admin User",
    role: "Administrator",
    department: "System Administration",
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Admin Dashboard" userInfo={userInfo} />
      <main className="p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground">
              Administration Portal
            </h2>
            <p className="text-muted-foreground">
              Manage campus operations and system configuration
            </p>
          </div>

          {/* System Overview */}
          <div className="bg-gradient-card border border-border rounded-xl p-6 shadow-sm animate-fade-in">
            <h3 className="text-lg font-semibold text-foreground mb-4">System Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  1,847
                </div>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  247
                </div>
                <p className="text-sm text-muted-foreground">Documents Uploaded</p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  99.8%
                </div>
                <p className="text-sm text-muted-foreground">Chatbot Uptime</p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  3,421
                </div>
                <p className="text-sm text-muted-foreground">Conversations</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            <Card
              title="Admin Assistant"
              icon={Bot}
              onClick={() => navigate("/admin/chatbot")}
            >
              <p className="text-sm">
                AI-powered insights for campus operations and management
              </p>
            </Card>

            <Card 
              title="Analytics Dashboard" 
              icon={BarChart3}
              onClick={() => navigate("/admin/analytics")}
            >
              <p className="text-sm">
                View comprehensive analytics, metrics, and insights
              </p>
            </Card>

            <Card
              title="User Management"
              icon={Shield}
              onClick={() => navigate("/admin/approvals")}
            >
              <p className="text-sm">Manage role approvals and access control</p>
            </Card>

            <Card title="System Settings" icon={Settings}>
              <p className="text-sm">
                Configure integrations and system-wide settings
              </p>
            </Card>
          </div>

          {/* Document Upload Section */}
          <div className="pt-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Upload className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  Document Management
                </h3>
                <p className="text-sm text-muted-foreground">
                  Upload and manage documents for the chatbot knowledge base
                </p>
              </div>
            </div>
            <DocumentUpload />
          </div>

          <div className="pt-6">
            <Button
              onClick={() => navigate("/admin/chatbot")}
              size="lg"
              className="bg-gradient-primary hover:shadow-glow transition-all"
            >
              <Bot className="w-5 h-5 mr-2" />
              Open Admin Assistant
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
