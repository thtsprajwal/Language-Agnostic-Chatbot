import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Auth
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Login
import LoginPage from "./pages/login";
import RegisterPage from "./pages/auth/register";
import RequestEmailVerificationPage from "./pages/auth/request-email-verification";
import VerifyEmailPage from "./pages/auth/verify-email";
import RequestPasswordResetPage from "./pages/auth/request-password-reset";
import ResetPasswordPage from "./pages/auth/reset-password";
import SecuritySettingsPage from "./pages/account/security";

// Student Pages
import StudentDashboard from "./pages/student";
import FeesPage from "./pages/student/fees";
import FeedbackPage from "./pages/student/feedback";
import CertificatesPage from "./pages/student/certificates";
import AttendancePage from "./pages/student/attendance";
import NoticesPage from "./pages/student/notices";
import TimetablePage from "./pages/student/timetable";
import StudentChatbot from "./pages/student/chatbot";

// Faculty Pages
import FacultyDashboard from "./pages/faculty";
import FacultyChatbot from "./pages/faculty/chatbot";
import FacultyAnalytics from "./pages/faculty/analytics";

// Admin Pages
import AdminDashboard from "./pages/admin";
import AdminApprovals from "./pages/admin/approvals";
import AdminChatbot from "./pages/admin/chatbot";
import AdminAnalytics from "./pages/admin/analytics";

// Visitor
import VisitorLanding from "./pages/visitor";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/request-email-verification" element={<RequestEmailVerificationPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/request-password-reset" element={<RequestPasswordResetPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/visitor" element={<VisitorLanding />} />
            <Route
              path="/account/security"
              element={
                <ProtectedRoute>
                  <SecuritySettingsPage />
                </ProtectedRoute>
              }
            />
            
            {/* Student Routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute requiredRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/fees"
              element={
                <ProtectedRoute requiredRole="student">
                  <FeesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/feedback"
              element={
                <ProtectedRoute requiredRole="student">
                  <FeedbackPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/certificates"
              element={
                <ProtectedRoute requiredRole="student">
                  <CertificatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/attendance"
              element={
                <ProtectedRoute requiredRole="student">
                  <AttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/notices"
              element={
                <ProtectedRoute requiredRole="student">
                  <NoticesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/timetable"
              element={
                <ProtectedRoute requiredRole="student">
                  <TimetablePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/chatbot"
              element={
                <ProtectedRoute requiredRole="student">
                  <StudentChatbot />
                </ProtectedRoute>
              }
            />
            
            {/* Faculty Routes */}
            <Route
              path="/faculty"
              element={
                <ProtectedRoute requiredRole="faculty">
                  <FacultyDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/faculty/chatbot"
              element={
                <ProtectedRoute requiredRole="faculty">
                  <FacultyChatbot />
                </ProtectedRoute>
              }
            />
            <Route
              path="/faculty/analytics"
              element={
                <ProtectedRoute requiredRole="faculty">
                  <FacultyAnalytics />
                </ProtectedRoute>
              }
            />
            
            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/approvals"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminApprovals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/chatbot"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminChatbot />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminAnalytics />
                </ProtectedRoute>
              }
            />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
