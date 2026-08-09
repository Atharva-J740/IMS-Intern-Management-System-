import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Deliverable } from '../types/learning';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Archive, FileCode2, FileText, GitPullRequest, LayoutTemplate, MessageSquareText, Upload, CheckCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const deliverableSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  type: z.string().min(1, "Please select a type"),
  url: z.string().min(1, "URL or path is required"),
});
type DeliverableFormValues = z.infer<typeof deliverableSchema>;

const reviewSchema = z.object({
  status: z.enum(['Approved', 'Rejected']),
  feedback: z.string().optional(),
});
type ReviewFormValues = z.infer<typeof reviewSchema>;

export default function DeliverablesVault() {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reviewDeliverable, setReviewDeliverable] = useState<Deliverable | null>(null);
  const { user } = useAuth();

  const form = useForm<DeliverableFormValues>({
    resolver: zodResolver(deliverableSchema),
    defaultValues: {
      title: '',
      type: '',
      url: '',
    },
  });

  const reviewForm = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      status: 'Approved',
      feedback: '',
    },
  });

  // Whenever the reviewDeliverable changes, reset its form
  useEffect(() => {
    if (reviewDeliverable) {
      reviewForm.reset({
        status: reviewDeliverable.status === 'Submitted' || reviewDeliverable.status === 'Draft' ? 'Approved' : (reviewDeliverable.status as any),
        feedback: reviewDeliverable.feedback || ''
      });
    }
  }, [reviewDeliverable, reviewForm]);

  const fetchDeliverables = async () => {
    try {
      let query = supabase.from('deliverables').select('*').order('submitted_date', { ascending: false });
      if (user?.role === 'INTERN') {
        query = query.eq('intern_id', user.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data) setDeliverables(data as Deliverable[]);
    } catch (err) {
      console.error('Error fetching deliverables', err);
      toast.error('Failed to fetch deliverables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliverables();
  }, [user]);

  const onSubmit = async (values: DeliverableFormValues) => {
    if (!user) return;

    try {
      const newDeliverable = {
        intern_id: user.id,
        title: values.title,
        type: values.type,
        url: values.url,
        status: 'Submitted',
        submitted_date: new Date().toISOString()
      };

      const { error } = await supabase.from('deliverables').insert([newDeliverable]);
      if (error) throw error;
      
      form.reset();
      setIsDialogOpen(false);
      fetchDeliverables();
      toast.success('Deliverable submitted successfully!');
    } catch (err) {
      console.error('Error submitting deliverable', err);
      toast.error('Failed to submit deliverable');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deliverable?')) return;
    try {
      const { error } = await supabase.from('deliverables').delete().eq('id', id);
      if (error) throw error;
      fetchDeliverables();
      toast.success('Deliverable deleted');
    } catch (err) {
      console.error('Error deleting deliverable', err);
      toast.error('Failed to delete deliverable');
    }
  };

  const onReviewSubmit = async (values: ReviewFormValues) => {
    if (!user || !reviewDeliverable) return;

    try {
      const { error } = await supabase
        .from('deliverables')
        .update({
          status: values.status,
          feedback: values.feedback || null
        })
        .eq('id', reviewDeliverable.id);

      if (error) throw error;

      toast.success(`Deliverable marked as ${values.status}!`);
      setReviewDeliverable(null);
      fetchDeliverables();
    } catch (err) {
      console.error('Error saving review', err);
      toast.error('Failed to save review');
    }
  };

  const getTypeIcon = (type: Deliverable['type']) => {
    switch (type) {
      case 'PR': return <GitPullRequest className="w-4 h-4 text-purple-500" />;
      case 'Document': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'Script': return <FileCode2 className="w-4 h-4 text-yellow-500" />;
      case 'Diagram': return <LayoutTemplate className="w-4 h-4 text-orange-500" />;
      default: return <Archive className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: Deliverable['status']) => {
    switch (status) {
      case 'Approved': return <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>;
      case 'Submitted': return <Badge className="bg-blue-500 hover:bg-blue-600">Submitted</Badge>;
      case 'Rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="outline">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Archive className="w-8 h-8 text-primary" />
          Deliverables Vault
        </h1>
        <p className="text-muted-foreground mt-1">All your project outputs, PRs, documents, and scripts in one place.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Artifacts & Outputs</CardTitle>
              <CardDescription>A complete log of your tangible contributions.</CardDescription>
            </div>
            {user?.role === 'INTERN' && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Upload className="w-4 h-4" />
                    Submit Deliverable
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Submit Deliverable</DialogTitle>
                    <DialogDescription>
                      Log a new output for your internship portfolio.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Auth Gateway PR" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="PR">Pull Request</SelectItem>
                                <SelectItem value="Document">Document</SelectItem>
                                <SelectItem value="Script">Script/Code</SelectItem>
                                <SelectItem value="Diagram">Diagram</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="url"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Link / URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://github.com/..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end pt-4">
                        <Button type="submit">Submit</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="w-[40%]">Deliverable</TableHead>
                <TableHead>Date Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Loading deliverables...</TableCell>
                </TableRow>
              ) : deliverables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No deliverables found in the vault.
                  </TableCell>
                </TableRow>
              ) : (
                deliverables.map(deliverable => (
                  <TableRow key={deliverable.id}>
                    <TableCell>
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted/50 border border-border">
                        {getTypeIcon(deliverable.type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{deliverable.title}</span>
                      {deliverable.feedback && (
                        <div className="mt-1">
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <Badge variant="secondary" className="cursor-pointer text-[10px] gap-1 hover:bg-secondary/80">
                                <MessageSquareText className="w-3 h-3" />
                                Feedback
                              </Badge>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold">Reviewer Feedback</h4>
                                <p className="text-sm text-muted-foreground">{deliverable.feedback}</p>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(deliverable.submitted_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(deliverable.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {user?.role === 'INTERN' && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(deliverable.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                      
                      <Button variant="ghost" size="sm" asChild>
                        <a href={deliverable.url} target="_blank" rel="noreferrer">Open</a>
                      </Button>
                      
                      {user?.role === 'ADMIN' && (
                        <Button 
                          variant={deliverable.status === 'Submitted' ? 'default' : 'outline'} 
                          size="sm" 
                          onClick={() => setReviewDeliverable(deliverable)}
                        >
                          Review
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Modal for Admin */}
      <Dialog open={!!reviewDeliverable} onOpenChange={(open) => !open && setReviewDeliverable(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Review Deliverable</DialogTitle>
            <DialogDescription>
              Evaluate the deliverable and provide feedback to the intern.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...reviewForm}>
            <form onSubmit={reviewForm.handleSubmit(onReviewSubmit)} className="space-y-4 py-4">
              <FormField
                control={reviewForm.control}
                name="status"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select outcome" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Approved">Approve</SelectItem>
                        <SelectItem value="Rejected">Reject</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={reviewForm.control}
                name="feedback"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Feedback (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Leave constructive feedback..." className="h-24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end pt-4">
                <Button type="submit" className="gap-2">
                  <CheckCircle className="w-4 h-4" /> Save Review
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
