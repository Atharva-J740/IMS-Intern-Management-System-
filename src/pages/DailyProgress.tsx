import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Clock, CheckCircle2, BookOpen, Archive } from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function DailyProgress() {
  const { user } = useAuth();
  const [unifiedFeed, setUnifiedFeed] = useState<any[]>([]);
  const [overallStats, setOverallStats] = useState({ tasks: 0, deliverables: 0, learning: 0 });
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    if (!user) return;
    try {
      // Fetch tasks for the dropdown
      let taskQuery = supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (user.role === 'INTERN') taskQuery = taskQuery.eq('intern_id', user.id);

      // Fetch actual progress logs
      let logQuery = supabase.from('progress_logs').select('*, tasks(title), profiles(name)').order('created_at', { ascending: false });
      if (user.role === 'INTERN') logQuery = logQuery.eq('intern_id', user.id);
      
      let allTasksQuery = supabase.from('tasks').select('*, profiles(name)').eq('status', 'Completed');
      if (user.role === 'INTERN') allTasksQuery = allTasksQuery.eq('intern_id', user.id);

      let allDelivQuery = supabase.from('deliverables').select('*, profiles(name)');
      if (user.role === 'INTERN') allDelivQuery = allDelivQuery.eq('intern_id', user.id);
      
      let allLearningQuery = supabase.from('learning_topics').select('*, profiles(name)').eq('status', 'Mastered');
      if (user.role === 'INTERN') allLearningQuery = allLearningQuery.eq('intern_id', user.id);

      const [logRes, completedTasksRes, delivRes, learnRes] = await Promise.all([
        logQuery, allTasksQuery, allDelivQuery, allLearningQuery
      ]);
      
      const rawLogs = logRes.data || [];
      const compTasks = completedTasksRes.data || [];
      const delivs = delivRes.data || [];
      const learned = learnRes.data || [];
      
      setOverallStats({
        tasks: compTasks.length,
        deliverables: delivs.filter((d: any) => d.status === 'Approved').length,
        learning: learned.length
      });

      // Build unified feed
      const feed: any[] = [];
      
      rawLogs.forEach(log => {
        let dateStr = log.log_date;
        if (!dateStr && log.created_at) {
          try { dateStr = new Date(log.created_at).toISOString().split('T')[0]; } catch(e) {}
        }
        feed.push({
          id: 'log-' + log.id,
          type: 'log',
          date: dateStr,
          timestamp: log.created_at,
          intern: log.profiles?.name || 'Intern',
          title: `Logged ${log.time_spent}h on: ${log.tasks?.title || 'General Task'}`,
          desc: log.what_did_you_do
        });
      });

      compTasks.forEach((t: any) => {
        const dateStr = t.completed_at ? t.completed_at.split('T')[0] : t.created_at.split('T')[0];
        feed.push({
          id: 'task-' + t.id,
          type: 'task',
          date: dateStr,
          timestamp: t.completed_at || t.created_at,
          intern: t.profiles?.name || 'Intern',
          title: `Completed Task: ${t.title}`,
          desc: t.category
        });
      });

      delivs.forEach((d: any) => {
        if (d.status === 'Draft') return;
        const dateStr = d.submitted_date ? d.submitted_date.split('T')[0] : d.created_at?.split('T')[0];
        feed.push({
          id: 'deliv-' + d.id,
          type: 'deliverable',
          date: dateStr,
          timestamp: d.submitted_date || d.created_at,
          intern: d.profiles?.name || 'Intern',
          title: `${d.status === 'Approved' ? 'Approved' : 'Submitted'} Deliverable: ${d.title}`,
          desc: d.type
        });
      });

      learned.forEach((l: any) => {
        const dateStr = l.created_at.split('T')[0]; // using created_at as we don't have completed_at for learning
        feed.push({
          id: 'learn-' + l.id,
          type: 'learning',
          date: dateStr,
          timestamp: l.created_at,
          intern: l.profiles?.name || 'Intern',
          title: `Mastered Topic: ${l.concept}`,
          desc: l.description
        });
      });

      feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setUnifiedFeed(feed);
      
    } catch (err) {
      console.error('Error fetching data', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);
  
  const currentDayFeed = unifiedFeed.filter(item => item.date === selectedDate);

  return (
    <ErrorBoundary>
      <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Daily Progress</h1>
          <p className="text-muted-foreground mt-1">Record your work and view your history.</p>
        </div>



      {/* History List */}
      <div className="mt-8 mb-8 flex items-center justify-between">
        <h2 className="text-xl font-bold">Progress History</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Select Date:</span>
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="w-auto"
          />
        </div>
      </div>

      <div className="space-y-4">
        {currentDayFeed.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
            No progress activities found for this date.
          </div>
        ) : (
          currentDayFeed.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {item.type === 'log' && <Clock className="w-4 h-4 text-blue-500" />}
                      {item.type === 'task' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {item.type === 'deliverable' && <Archive className="w-4 h-4 text-purple-500" />}
                      {item.type === 'learning' && <BookOpen className="w-4 h-4 text-orange-500" />}
                      <h3 className="font-bold text-lg">{item.title}</h3>
                    </div>
                    {user?.role !== 'INTERN' && (
                      <p className="text-sm font-medium text-primary mb-2">Intern: {item.intern}</p>
                    )}
                    <p className="text-muted-foreground whitespace-pre-wrap text-sm">{item.desc}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap bg-muted px-2 py-1 rounded">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Overall Progress */}
      <div className="mt-12 mb-8">
        <h2 className="text-xl font-bold mb-4">Overall Progress Summary</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{overallStats.tasks}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Deliverables Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-500">{overallStats.deliverables}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Learning Topics Mastered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">{overallStats.learning}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all time</p>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </ErrorBoundary>
  );
}
