import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { MessageSquare, Calendar, User, Trash2, Edit2, X, Check } from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function Feedback() {
  const { user } = useAuth();
  
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [interns, setInterns] = useState<{id: string, name: string}[]>([]);
  
  const [selectedInternId, setSelectedInternId] = useState<string>('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  useEffect(() => {
    fetchFeedbacks();
    if (user?.role === 'ADMIN') {
      supabase.from('profiles').select('id, name').eq('role', 'INTERN').then(({ data }) => {
        if (data) {
          setInterns(data.filter(intern => intern.name === 'Intern User'));
        }
      });
    }
  }, [user]);

  const fetchFeedbacks = async () => {
    if (!user) return;
    try {
      let query = supabase.from('feedbacks').select(`
        id, 
        content, 
        created_at, 
        intern:profiles!feedbacks_intern_id_fkey(name),
        admin:profiles!feedbacks_admin_id_fkey(name)
      `).order('created_at', { ascending: false });

      if (user.role === 'INTERN') {
        query = query.eq('intern_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFeedbacks(data || []);
    } catch (err) {
      console.error('Error fetching feedbacks', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== 'ADMIN') return;
    if (!selectedInternId) return toast.error('Please select an intern');
    if (!content.trim()) return toast.error('Please enter feedback content');
    
    setLoading(true);
    try {
      const { error } = await supabase.from('feedbacks').insert([{
        intern_id: selectedInternId,
        admin_id: user.id,
        content: content.trim()
      }]);

      if (error) throw error;
      toast.success('Feedback submitted successfully!');
      setContent('');
      setSelectedInternId('');
      fetchFeedbacks();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    
    try {
      const { error } = await supabase.from('feedbacks').delete().eq('id', id);
      if (error) throw error;
      toast.success('Feedback deleted successfully');
      fetchFeedbacks();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete feedback');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingContent.trim()) return toast.error('Feedback content cannot be empty');
    
    try {
      const { error } = await supabase.from('feedbacks').update({
        content: editingContent.trim()
      }).eq('id', id);
      
      if (error) throw error;
      toast.success('Feedback updated successfully');
      setEditingId(null);
      fetchFeedbacks();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update feedback');
    }
  };

  const startEditing = (f: any) => {
    setEditingId(f.id);
    setEditingContent(f.content);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-primary" />
            Feedback & Evaluation
          </h1>
          <p className="text-muted-foreground mt-1">Review feedback and performance evaluations.</p>
        </div>

        {user?.role === 'ADMIN' && (
          <Card>
            <CardHeader>
              <CardTitle>Submit New Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Intern</label>
                  <Select value={selectedInternId} onValueChange={setSelectedInternId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an intern..." />
                    </SelectTrigger>
                    <SelectContent>
                      {interns.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Feedback Content</label>
                  <Textarea 
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Write detailed feedback and evaluation..."
                    className="min-h-[120px]"
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Previous Feedback</h2>
          
          {feedbacks.length === 0 ? (
            <p className="text-muted-foreground text-sm">No feedback has been recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {feedbacks.map(f => (
                <Card key={f.id} className="overflow-hidden">
                  <div className="bg-muted/50 px-6 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span className="font-medium text-foreground">
                        {user?.role === 'INTERN' ? `From: ${f.admin?.name}` : `For: ${f.intern?.name}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(f.created_at).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                      {user?.role === 'ADMIN' && (
                        <div className="flex items-center gap-1 ml-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7" 
                            onClick={() => startEditing(f)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(f.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <CardContent className="pt-6">
                    {editingId === f.id ? (
                      <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                        <Textarea 
                          value={editingContent}
                          onChange={e => setEditingContent(e.target.value)}
                          className="min-h-[100px]"
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4 mr-1" /> Cancel
                          </Button>
                          <Button size="sm" onClick={() => handleUpdate(f.id)}>
                            <Check className="w-4 h-4 mr-1" /> Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {f.content}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
