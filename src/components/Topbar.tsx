import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Bell, User as UserIcon } from 'lucide-react';

export const Topbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {/* Breadcrumb or Page Title can go here */}
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-destructive" />
        </Button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium leading-none">{user?.name}</span>
            <span className="text-xs text-muted-foreground mt-1 capitalize">
              {user?.role.toLowerCase()}
            </span>
          </div>
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <UserIcon className="h-5 w-5" />
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={logout} className="ml-2 text-muted-foreground hover:text-destructive transition-colors">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};
