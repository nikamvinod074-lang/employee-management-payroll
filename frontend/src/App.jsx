import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/common/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import AttendancePage from "./pages/AttendancePage";
import DashboardPage from "./pages/DashboardPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import EmployeeFormPage from "./pages/EmployeeFormPage";
import EmployeeDetailPage from "./pages/EmployeeDetailPage";
import EmployeesPage from "./pages/EmployeesPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LeavePage from "./pages/LeavePage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import PayrollPage from "./pages/PayrollPage";
import PayslipsPage from "./pages/PayslipsPage";
import ProfilePage from "./pages/ProfilePage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/employees" element={<EmployeesPage />} />
        <Route
          path="/employees/add"
          element={
            <ProtectedRoute roles={["ADMIN", "HR"]}>
              <EmployeeFormPage mode="create" />
            </ProtectedRoute>
          }
        />
        <Route path="/employees/:id" element={<EmployeeDetailPage />} />
        <Route
          path="/employees/:id/edit"
          element={
            <ProtectedRoute roles={["ADMIN", "HR"]}>
              <EmployeeFormPage mode="edit" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/departments"
          element={
            <ProtectedRoute roles={["ADMIN", "HR"]}>
              <DepartmentsPage />
            </ProtectedRoute>
          }
        />

        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/leave" element={<LeavePage />} />

        <Route
          path="/payroll"
          element={
            <ProtectedRoute roles={["ADMIN", "HR"]}>
              <PayrollPage />
            </ProtectedRoute>
          }
        />
        <Route path="/payslips" element={<PayslipsPage />} />

        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
