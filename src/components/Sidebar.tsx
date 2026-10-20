import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  CheckSquare, 
  BookOpen, 
  FileText, 
  MessageSquare, 
  BarChart2, 
  CalendarDays, 
  Clock, 
  ShieldCheck,
  FolderLock
} from 'lucide-react';

const INTERN_ROUTES = [
  { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Daily Progress', path: '/daily-progress', icon: Clock },
  { name: 'Tasks', path: '/tasks', icon: CheckSquare },
  { name: 'Deliverables', path: '/deliverables', icon: FileText },
  { name: 'Learning Log', path: '/learning', icon: BookOpen },
  { name: 'Evidence', path: '/evidence', icon: FolderLock },
  { name: 'Feedback', path: '/feedback', icon: MessageSquare },
  { name: 'Analytics', path: '/analytics', icon: BarChart2 },
  { name: 'Weekly Reports', path: '/weekly-reports', icon: CalendarDays },
];

const ADMIN_ROUTES = [
  { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { name: "Today's Review", path: '/review', icon: CheckSquare },
  { name: 'Intern Progress', path: '/progress', icon: Clock },
  { name: 'Task Approval', path: '/approvals', icon: ShieldCheck },
  { name: 'Deliverables', path: '/deliverables', icon: FileText },
  { name: 'Feedback', path: '/feedback', icon: MessageSquare },
  { name: 'Analytics', path: '/analytics', icon: BarChart2 },
  { name: 'Weekly Reports', path: '/weekly-reports', icon: CalendarDays },
  { name: 'Audit Log', path: '/audit', icon: FolderLock },
];

const VIEWER_ROUTES = [
  { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Daily Progress', path: '/daily-progress', icon: Clock },
  { name: 'Tasks', path: '/tasks', icon: CheckSquare },
  { name: 'Deliverables', path: '/deliverables', icon: FileText },
  { name: 'Learning', path: '/learning', icon: BookOpen },
  { name: 'Feedback', path: '/feedback', icon: MessageSquare },
  { name: 'Analytics', path: '/analytics', icon: BarChart2 },
  { name: 'Weekly Reports', path: '/weekly-reports', icon: CalendarDays },
];

export const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const routes = user?.role === 'ADMIN' 
    ? ADMIN_ROUTES 
    : user?.role === 'VIEWER' 
      ? VIEWER_ROUTES 
      : INTERN_ROUTES;

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen flex flex-col transition-all">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <h1 className="text-xl font-bold tracking-tight text-primary">CIRT</h1>
        <span className="ml-2 text-xs font-medium px-2 py-0.5 bg-accent/20 text-accent-foreground rounded-full">
          {user?.role}
        </span>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {routes.map((route) => {
          const isActive = location.pathname === route.path || location.pathname.startsWith(`${route.path}/`);
          const Icon = route.icon;
          
          return (
            <Link
              key={route.path}
              to={route.path}
              className={cn(
                "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-accent/10 hover:text-accent-foreground"
              )}
            >
              <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
              {route.name}
            </Link>
          );
        })}
      </nav>

    </aside>
  );
};
