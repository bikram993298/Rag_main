import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import ChatBox from "./components/ChatBox";
import DashboardPage from "./pages/DashboardPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import ExamSetupPage from "./pages/ExamSetupPage";
import ExamPage from "./pages/ExamPage";
import ExamResultPage from "./pages/ExamResultPage";
import ExamHistoryPage from "./pages/ExamHistoryPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";

function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login"        element={<LoginPage />} />
          <Route path="/signup"       element={<SignupPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Protected routes — share Navbar layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/chat"              element={<ChatBox />} />
            <Route path="/dashboard"         element={<DashboardPage />} />
            <Route path="/flashcards"        element={<FlashcardsPage />} />

            {/* Exam routes — order matters: specifics before :sessionId */}
            <Route path="/exam/setup"        element={<ExamSetupPage />} />
            <Route path="/exam/history"      element={<ExamHistoryPage />} />
            <Route path="/exam/:sessionId/result" element={<ExamResultPage />} />
            <Route path="/exam/:sessionId"   element={<ExamPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/chat" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
