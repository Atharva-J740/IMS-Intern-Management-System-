import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, BookOpen, Archive, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Helper function to get the Monday of the selected week string (e.g. "2026-W42")
function getStartOfWeek(weekStr: string): Date {
  if (!weekStr) return new Date();
  const [yearStr, weekPart] = weekStr.split('-W');
  if (!yearStr || !weekPart) return new Date();
  
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekPart, 10);
  
  // Create a date for Jan 1 of the given year
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
}

function getEndOfWeek(startOfWeek: Date): Date {
  const end = new Date(startOfWeek);
  end.setDate(startOfWeek.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export default function WeeklyReports() {
  const { user } = useAuth();
  
  // Set default week to current week
  const getInitialWeek = () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  };

  const [selectedWeek, setSelectedWeek] = useState(getInitialWeek());
  const [selectedInternId, setSelectedInternId] = useState<string>('all');
  const [interns, setInterns] = useState<{id: string, name: string}[]>([]);
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [learningTopics, setLearningTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch all interns for admin/viewer dropdown
    if (user?.role !== 'INTERN') {
      supabase.from('profiles').select('id, name').eq('role', 'INTERN').then(({ data }) => {
        if (data) setInterns(data);
      });
    }
  }, [user]);

  useEffect(() => {
    fetchWeeklyData();
  }, [user, selectedWeek, selectedInternId]);

  const fetchWeeklyData = async () => {
    if (!user || !selectedWeek) return;
    setLoading(true);
    try {
      const start = getStartOfWeek(selectedWeek);
      const end = getEndOfWeek(start);

      // Base queries
      let taskQuery = supabase.from('tasks').select('*, profiles(name)').eq('status', 'Completed');
      let delivQuery = supabase.from('deliverables').select('*, profiles(name)');
      let learnQuery = supabase.from('learning_topics').select('*, profiles(name)').eq('status', 'Mastered');

      // Filter by User Role / Selected Intern
      if (user.role === 'INTERN') {
        taskQuery = taskQuery.eq('intern_id', user.id);
        delivQuery = delivQuery.eq('intern_id', user.id);
        learnQuery = learnQuery.eq('intern_id', user.id);
      } else if (selectedInternId !== 'all') {
        taskQuery = taskQuery.eq('intern_id', selectedInternId);
        delivQuery = delivQuery.eq('intern_id', selectedInternId);
        learnQuery = learnQuery.eq('intern_id', selectedInternId);
      }

      const [taskRes, delivRes, learnRes] = await Promise.all([taskQuery, delivQuery, learnQuery]);

      // Filter by date range
      const filteredTasks = (taskRes.data || []).filter(t => {
        const d = new Date(t.completed_at || t.created_at);
        return d >= start && d <= end;
      });

      const filteredDelivs = (delivRes.data || []).filter(d => {
        if (d.status === 'Draft') return false;
        const dDate = new Date(d.submitted_date || d.created_at);
        return dDate >= start && dDate <= end;
      });

      const filteredLearn = (learnRes.data || []).filter(l => {
        const lDate = new Date(l.created_at);
        return lDate >= start && lDate <= end;
      });

      setTasks(filteredTasks);
      setDeliverables(filteredDelivs);
      setLearningTopics(filteredLearn);

    } catch (err) {
      console.error('Error fetching weekly data', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate Efficiency
  const calculateEfficiency = () => {
    if (tasks.length === 0) return 0;
    
    let totalEstimated = 0;
    let totalActual = 0;
    let validTasks = 0;
    
    tasks.forEach(t => {
      if (t.estimated_time > 0 && t.actual_time > 0) {
        totalEstimated += Number(t.estimated_time);
        totalActual += Number(t.actual_time);
        validTasks++;
      }
    });

    if (validTasks === 0) return 100; // If no tasks have time logged, assume 100%
    if (totalActual === 0) return 100;

    const eff = (totalEstimated / totalActual) * 100;
    return Math.round(eff);
  };

  const efficiency = calculateEfficiency();

  return (
    <ErrorBoundary>
      <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Weekly Reports</h1>
            <p className="text-muted-foreground mt-1">Summary of work completed per week.</p>
          </div>

          <div className="flex items-center space-x-4 w-full sm:w-auto flex-wrap gap-y-2">
            {user?.role !== 'INTERN' && (
              <div className="w-full sm:w-48">
                <Select value={selectedInternId} onValueChange={setSelectedInternId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Interns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Interns</SelectItem>
                    {interns.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex items-center space-x-2 bg-background border border-input rounded-md px-3 h-10 w-full sm:w-auto">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <input 
                type="week" 
                value={selectedWeek} 
                onChange={(e) => setSelectedWeek(e.target.value)} 
                className="bg-transparent border-none outline-none text-sm w-full focus:ring-0"
              />
            </div>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{tasks.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Deliverables</CardTitle>
              <Archive className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-500">{deliverables.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Topics Mastered</CardTitle>
              <BookOpen className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">{learningTopics.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">{efficiency}%</div>
            </CardContent>
          </Card>
        </div>

        {/* DETAILED LISTS */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground">Loading week data...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" /> 
                  Tasks Completed This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No tasks completed in this week.</p>
                ) : (
                  <div className="space-y-4">
                    {tasks.map(t => (
                      <div key={t.id} className="p-4 bg-muted/30 rounded-lg border border-border">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{t.title}</h3>
                          <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">
                            {t.actual_time > 0 ? `${t.actual_time}h logged` : 'Done'}
                          </span>
                        </div>
                        {user?.role !== 'INTERN' && <p className="text-xs text-primary font-medium mb-1">{t.profiles?.name}</p>}
                        <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">{t.description || 'No description provided.'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="w-5 h-5 text-purple-500" /> 
                  Deliverables Submitted
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deliverables.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No deliverables submitted in this week.</p>
                ) : (
                  <div className="space-y-4">
                    {deliverables.map(d => (
                      <div key={d.id} className="p-4 bg-muted/30 rounded-lg border border-border">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{d.title}</h3>
                          <span className="text-xs bg-purple-500/10 text-purple-500 px-2 py-1 rounded">{d.type}</span>
                        </div>
                        {user?.role !== 'INTERN' && <p className="text-xs text-primary font-medium mb-1">{d.profiles?.name}</p>}
                        <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">View Deliverable</a>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-orange-500" /> 
                  Learning Topics Mastered
                </CardTitle>
              </CardHeader>
              <CardContent>
                {learningTopics.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No learning topics mastered in this week.</p>
                ) : (
                  <div className="space-y-4">
                    {learningTopics.map(l => (
                      <div key={l.id} className="p-4 bg-muted/30 rounded-lg border border-border">
                        <h3 className="font-semibold mb-1">{l.concept}</h3>
                        {user?.role !== 'INTERN' && <p className="text-xs text-primary font-medium mb-1">{l.profiles?.name}</p>}
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{l.description || 'No description provided.'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
