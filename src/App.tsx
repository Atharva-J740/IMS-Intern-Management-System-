import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './layouts/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import DailyProgress from './pages/DailyProgress';
import LearningHub from './pages/LearningHub';
import DeliverablesVault from './pages/DeliverablesVault';
import WeeklyReports from './pages/WeeklyReports';
import Feedback from './pages/Feedback';
import Placeholder from './pages/Placeholder';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/daily-progress" element={<DailyProgress />} />
              <Route path="/learning" element={<LearningHub />} />
              <Route path="/deliverables" element={<DeliverablesVault />} />
              
              {/* Aliased/Placeholder Routes to prevent redirecting to Dashboard */}
              <Route path="/evidence" element={<DeliverablesVault />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/analytics" element={<Dashboard />} />
              <Route path="/weekly-reports" element={<WeeklyReports />} />
              <Route path="/review" element={<Tasks />} />
              <Route path="/progress" element={<DailyProgress />} />
              <Route path="/approvals" element={<Tasks />} />
              <Route path="/audit" element={<Placeholder title="Audit Log" />} />
            </Route>
          </Route>
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
