import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle2, Clock, Flame, FolderCheck, GraduationCap, Target } from 'lucide-react';
import { toast } from 'sonner';

export default function InternDashboard() {
  const { user } = useAuth();
  
  const [metrics, setMetrics] = useState({
    efficiency: 0,
    tasksCompleted: 0,
    pendingTasks: 0,
    learningHours: 0,
    tangibleOutputs: 0,
    currentStreak: 0,
    internshipDay: 1
  });
  
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [efficiencyData, setEfficiencyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isClocking, setIsClocking] = useState(false);

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      // Fetch profile for start date
      const { data: profileData } = await supabase.from('profiles').select('created_at').eq('id', user.id).single();
      
      // Fetch tasks
      let tasksQuery = supabase.from('tasks').select('*');
      if (user.role === 'INTERN') tasksQuery = tasksQuery.eq('intern_id', user.id);
      const { data: tasksData } = await tasksQuery;
      
      // Fetch ALL progress logs for analytics
      let allLogsQuery = supabase.from('progress_logs').select('*, tasks(title, category)').order('log_date', { ascending: false });
      if (user.role === 'INTERN') allLogsQuery = allLogsQuery.eq('intern_id', user.id);
      const { data: allLogsData } = await allLogsQuery;
      
      // Fetch deliverables
      let delivQuery = supabase.from('deliverables').select('*');
      if (user.role === 'INTERN') delivQuery = delivQuery.eq('intern_id', user.id);
      const { data: delivData } = await delivQuery;

      // Fetch time sessions
      let timeQuery = supabase.from('time_sessions').select('*');
      if (user.role === 'INTERN') timeQuery = timeQuery.eq('intern_id', user.id);
      const { data: timeData } = await timeQuery;

      if (tasksData && allLogsData && delivData && timeData) {
        const completedTasks = tasksData.filter(t => t.status === 'Completed').length;
        const pendingTasks = tasksData.length - completedTasks;
        
        // Calculate Time Invested using time_sessions
        const clockedHours = timeData.reduce((acc, t) => acc + Number(t.duration_hours || 0), 0);
        
        // Set active session if any
        const active = timeData.find(t => !t.clock_out);
        setActiveSession(active || null);

        const approvedOutputs = delivData.filter(d => d.status === 'Approved').length;
        
        // Calculate Internship Day
        const startDate = profileData ? new Date(profileData.created_at) : new Date();
        const today = new Date();
        const diffDays = Math.ceil(Math.abs(today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;

        // Calculate Streak
        const uniqueDates = Array.from(new Set(allLogsData.map(log => log.log_date))).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        let streak = 0;
        
        if (uniqueDates.length > 0) {
            const currentDate = new Date();
            currentDate.setHours(0,0,0,0);
            const lastLogDate = new Date(uniqueDates[0]);
            lastLogDate.setHours(0,0,0,0);
            
            const diffToToday = Math.floor((currentDate.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diffToToday <= 1) { // logged today or yesterday
                for (let i = 0; i < uniqueDates.length; i++) {
                    const logDate = new Date(uniqueDates[i]);
                    logDate.setHours(0,0,0,0);
                    const expectedDate = new Date(currentDate);
                    expectedDate.setDate(currentDate.getDate() - i - diffToToday);
                    
                    if (logDate.getTime() === expectedDate.getTime()) {
                        streak++;
                    } else {
                        break;
                    }
                }
            }
        }

        setMetrics({
          efficiency: tasksData.length > 0 ? Math.round((completedTasks / tasksData.length) * 100) : 0,
          tasksCompleted: completedTasks,
          pendingTasks: pendingTasks,
          learningHours: Number(clockedHours.toFixed(1)),
          tangibleOutputs: approvedOutputs,
          currentStreak: streak,
          internshipDay: diffDays
        });

        // Format recent activity (top 5)
        const recentLogs = allLogsData.slice(0, 5);
        const formattedActivity = recentLogs.map(log => ({
          id: log.id,
          time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date(log.log_date).toLocaleDateString(),
          category: log.tasks?.category || 'Task',
          activity: log.what_did_you_do || 'Updated progress',
          duration: `${log.time_spent}h`,
          result: log.outcome || 'No outcome recorded'
        }));
        setRecentActivity(formattedActivity);
        
        // Generate chart data (last 7 days hours based on progress_logs and time_sessions)
        const last7Days = Array.from({length: 7}).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
        });

        const chartData = last7Days.map(dateStr => {
          const logsOnDate = allLogsData.filter(log => log.log_date === dateStr);
          const sessionsOnDate = timeData.filter(t => t.clock_out && t.clock_out.split('T')[0] === dateStr);
          
          const totalHrs = logsOnDate.reduce((sum, log) => sum + Number(log.time_spent || 0), 0);
          const sessionHrs = sessionsOnDate.reduce((sum, t) => sum + Number(t.duration_hours || 0), 0);
          
          return {
            name: new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short' }),
            hours: totalHrs + sessionHrs
          };
        });
        setEfficiencyData(chartData);
      }
    } catch (err) {
      console.error('Error fetching dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleClockIn = async () => {
    if (!user) return;
    setIsClocking(true);
    try {
      const { data, error } = await supabase.from('time_sessions').insert([{
        intern_id: user.id
      }]).select().single();
      if (error) throw error;
      setActiveSession(data);
      toast.success('Clocked in successfully');
    } catch (err) {
      toast.error('Failed to clock in');
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOut = async () => {
    if (!user || !activeSession) return;
    setIsClocking(true);
    try {
      const clockInDate = new Date(activeSession.clock_in);
      const clockOutDate = new Date();
      const diffHours = (clockOutDate.getTime() - clockInDate.getTime()) / (1000 * 60 * 60);
      
      const { error } = await supabase.from('time_sessions').update({
        clock_out: clockOutDate.toISOString(),
        duration_hours: Number(diffHours.toFixed(2))
      }).eq('id', activeSession.id);
      
      if (error) throw error;
      
      setActiveSession(null);
      toast.success('Clocked out successfully');
      fetchDashboardData();
    } catch (err) {
      toast.error('Failed to clock out');
    } finally {
      setIsClocking(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-muted-foreground">Loading dashboard data...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Hero Section */}
      <section className="bg-card border border-border p-8 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-10 w-40 h-40 bg-accent/5 rounded-full blur-2xl" />
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Good Morning, {user?.name} 👋
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Here's your internship progress at a glance. You are on <strong className="text-foreground">Day {metrics.internshipDay}</strong>.
            </p>
            <div className="mt-6 flex items-center gap-4">
              {user?.role === 'INTERN' && (
                !activeSession ? (
                  <Button onClick={handleClockIn} disabled={isClocking} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-md">
                    <Clock className="w-4 h-4 mr-2" /> Clock In
                  </Button>
                ) : (
                  <div className="flex items-center gap-4">
                    <Button onClick={handleClockOut} disabled={isClocking} variant="destructive" className="font-semibold px-6 shadow-md">
                      <Clock className="w-4 h-4 mr-2" /> Clock Out
                    </Button>
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      Clocked in at {new Date(activeSession.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Current Streak</span>
            <div className="flex items-center gap-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-full">
              <Flame className="w-5 h-5 fill-current" />
              <span className="font-bold">{metrics.currentStreak} Days</span>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">Efficiency</span>
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-3xl font-bold">{metrics.efficiency}%</span>
              <Progress value={metrics.efficiency} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">Tasks Completed</span>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{metrics.tasksCompleted}</span>
              <span className="text-sm text-muted-foreground">/ {metrics.tasksCompleted + metrics.pendingTasks}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">Learning Hours</span>
              <GraduationCap className="w-5 h-5 text-accent" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{metrics.learningHours}</span>
              <span className="text-sm text-muted-foreground">hrs</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">Tangible Outputs</span>
              <FolderCheck className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{metrics.tangibleOutputs}</span>
              <span className="text-sm text-muted-foreground">approved</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Charts & Graphs */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Time Invested</CardTitle>
              <CardDescription>Hours logged per day over the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={efficiencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Area type="monotone" dataKey="hours" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorHours)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline / Recent Activity */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Daily Timeline</CardTitle>
              <CardDescription>Your recent activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity found.</p>
                ) : (
                  recentActivity.map((activity, i) => (
                    <div key={activity.id} className="relative pl-6 pb-2">
                      {/* Timeline line */}
                      {i !== recentActivity.length - 1 && (
                        <div className="absolute left-[9px] top-6 bottom-0 w-px bg-border" />
                      )}
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-1.5 h-[18px] w-[18px] rounded-full border-4 border-background bg-primary shadow-sm" />
                      
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-muted-foreground">{activity.time}</span>
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider px-1.5">{activity.category}</Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground">{activity.activity}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {activity.duration} • {activity.result}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
