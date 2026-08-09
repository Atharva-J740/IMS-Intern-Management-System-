import { useAuth } from '../hooks/useAuth';
import InternDashboard from './InternDashboard';
import AdminDashboard from './AdminDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  // Both INTERN and VIEWER see the Intern Dashboard for now
  return <InternDashboard />;
}
