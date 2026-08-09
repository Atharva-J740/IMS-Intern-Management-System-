import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Archive, Clock, Target } from 'lucide-react';
import type { Task } from '../types/task';
import type { Deliverable } from '../types/learning';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [unsubmittedTasks, setUnsubmittedTasks] = useState<Task[]>([]);
  const [pendingDeliverables, setPendingDeliverables] = useState<Deliverable[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [metrics, setMetrics] = useState({
    totalInterns: 0,
    totalHoursLogged: 0,
    overallCompletionRate: 0,
    totalApprovedDeliverables: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          tasksResponse, 
          unsubmittedTasksResponse,
          deliverablesResponse,
          profilesResponse,
          allTasksResponse,
          allLogsResponse,
          allDeliverablesResponse,
          timeSessionsResponse
        ] = await Promise.all([
          supabase.from('tasks').select('*').eq('approval_status', 'Pending Review'),
          supabase.from('tasks').select('*').eq('approval_status', 'Not Submitted'),
          supabase.from('deliverables').select('*').eq('status', 'Submitted'),
          supabase.from('profiles').select('*').eq('role', 'INTERN'),
          supabase.from('tasks').select('*'),
          supabase.from('progress_logs').select('*, profiles(name), tasks(title)'),
          supabase.from('deliverables').select('*').eq('status', 'Approved'),
          supabase.from('time_sessions').select('*, profiles(name)')
        ]);

        if (tasksResponse.data) setPendingTasks(tasksResponse.data as Task[]);
        if (unsubmittedTasksResponse.data) setUnsubmittedTasks(unsubmittedTasksResponse.data as Task[]);
        if (deliverablesResponse.data) setPendingDeliverables(deliverablesResponse.data as Deliverable[]);
        
        // Combine activities
        const logs = allLogsResponse.data || [];
        const sessions = timeSessionsResponse.data || [];
        
        // Calculate Metrics
        const internsCount = profilesResponse.data?.length || 0;
        const logHrs = logs.reduce((acc, log) => acc + Number(log.time_spent || 0), 0);
        const sessionHrs = sessions.reduce((acc, t) => acc + Number(t.duration_hours || 0), 0);
        const totalHrs = Number((logHrs + sessionHrs).toFixed(2));
        
        const allTasks = allTasksResponse.data || [];
        const completedTasks = allTasks.filter(t => t.status === 'Completed').length;
        const compRate = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;
        
        const approvedDelivs = allDeliverablesResponse.data?.length || 0;

        setMetrics({
          totalInterns: internsCount,
          totalHoursLogged: totalHrs,
          overallCompletionRate: compRate,
          totalApprovedDeliverables: approvedDelivs
        });
        
        // Prepare activity feed (combine progress logs and time sessions)
        const combinedActivity: any[] = [];
        logs.forEach(log => {
          let dateStr = log.log_date;
          if (!dateStr && log.created_at) {
            try { dateStr = new Date(log.created_at).toISOString().split('T')[0]; } catch(e) {}
          }
          combinedActivity.push({
            id: 'log-' + log.id,
            type: 'progress_log',
            intern_name: log.profiles?.name || 'Intern',
            date: dateStr,
            time: log.created_at,
            content: `Logged ${log.time_spent} hours on: ${log.tasks?.title || 'General Task'}`,
            details: log.what_did_you_do
          });
        });
        
        sessions.forEach(s => {
          if (!s.clock_out) return; // only completed sessions
          const dateStr = s.clock_out.split('T')[0];
          combinedActivity.push({
            id: 'session-' + s.id,
            type: 'time_session',
            intern_name: s.profiles?.name || 'Intern',
            date: dateStr,
            time: s.clock_out,
            content: `Clocked in and worked for ${s.duration_hours} hours.`,
            details: null
          });
        });
        
        // Sort newest first
        combinedActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setActivityLogs(combinedActivity);

      } catch (err) {
        console.error('Error fetching admin dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading admin overview...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {user?.name}. Here is what requires your attention.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tasks Pending Review</CardTitle>
            <Clock className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Deliverables Pending</CardTitle>
            <Archive className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDeliverables.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tasks Pending Submission</CardTitle>
            <Target className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unsubmittedTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Not submitted yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Hours Logged</CardTitle>
            <Clock className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalHoursLogged}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all interns</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance Section */}
      <div className="mb-6">
        <Card>
          <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-center">
            <div className="w-full md:w-1/2 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold flex items-center gap-2"><Target className="w-4 h-4 text-primary"/> Overall Completion Rate</span>
                <span className="font-bold">{metrics.overallCompletionRate}%</span>
              </div>
              <Progress value={metrics.overallCompletionRate} className="h-2" />
              <p className="text-sm text-muted-foreground">Percentage of assigned tasks fully completed across the team.</p>
            </div>
            
            <div className="w-full md:w-1/2 flex items-center justify-center border-t md:border-t-0 md:border-l border-border pt-6 md:pt-0">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-500 mb-1">{metrics.totalApprovedDeliverables}</div>
                <p className="text-sm font-medium">Approved Deliverables</p>
                <p className="text-xs text-muted-foreground">Tangible outputs delivered to the company</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tasks Needing Approval</CardTitle>
            <CardDescription>Recent tasks marked as 'Pending Review'.</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks currently pending review.</p>
            ) : (
              <div className="space-y-4">
                {pendingTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                    <div>
                      <h4 className="text-sm font-semibold">{task.title}</h4>
                      <p className="text-xs text-muted-foreground">{task.category}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate('/tasks')}>Review</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deliverables Needing Review</CardTitle>
            <CardDescription>Recent outputs submitted for your review.</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingDeliverables.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deliverables currently pending review.</p>
            ) : (
              <div className="space-y-4">
                {pendingDeliverables.slice(0, 5).map(deliverable => (
                  <div key={deliverable.id} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                    <div>
                      <h4 className="text-sm font-semibold">{deliverable.title}</h4>
                      <p className="text-xs text-muted-foreground">{deliverable.type}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate('/vault')}>Review</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Activity Feed Section */}
      <div className="mt-8">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2">
            <div>
              <CardTitle>Team Activity Feed</CardTitle>
              <CardDescription>Track daily activities across all interns.</CardDescription>
            </div>
            <div className="flex items-center space-x-2 mt-4 sm:mt-0">
              <span className="text-sm text-muted-foreground"><Calendar className="w-4 h-4 inline mr-1" />Date:</span>
              <Input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
                className="w-auto h-9"
              />
              {selectedDate && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate('')}>
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {activityLogs.filter(log => !selectedDate || log.date === selectedDate).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border-2 border-dashed border-border rounded-lg mt-4">
                No activities found for this date.
              </div>
            ) : (
              <div className="space-y-6 mt-4">
                {activityLogs
                  .filter(log => !selectedDate || log.date === selectedDate)
                  .map(log => (
                  <div key={log.id} className="flex gap-4 p-4 rounded-lg bg-muted/20 border border-border">
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-semibold text-primary">{log.intern_name}</span>
                        <span className="text-xs text-muted-foreground">{new Date(log.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="text-sm mt-1">{log.content}</p>
                      {log.details && (
                        <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded italic">
                          "{log.details}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
