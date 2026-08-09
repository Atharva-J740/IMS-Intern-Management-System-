import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { Task } from '../types/task';
import { supabase } from '../lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, Search, Trash2, Calendar } from 'lucide-react';
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

const taskSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters' }),
  category: z.string().optional(),
  description: z.string().optional(),
});
type TaskFormValues = z.infer<typeof taskSchema>;

const reviewSchema = z.object({
  approval_status: z.enum(['Approved', 'Rejected']),
});
type ReviewFormValues = z.infer<typeof reviewSchema>;

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reviewTask, setReviewTask] = useState<Task | null>(null);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      category: '',
      description: '',
    },
  });

  const reviewForm = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      approval_status: 'Approved',
    },
  });

  useEffect(() => {
    if (reviewTask) {
      reviewForm.reset({
        approval_status: reviewTask.approval_status === 'Pending Review' ? 'Approved' : (reviewTask.approval_status as any)
      });
    }
  }, [reviewTask, reviewForm]);

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    try {
      let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
      
      if (user?.role === 'INTERN') {
        query = query.eq('intern_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data) setTasks(data as Task[]);
    } catch (err) {
      console.error('Error fetching tasks', err);
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: TaskFormValues) => {
    if (!user) return;

    try {
      const newTask = {
        intern_id: user.id,
        title: values.title,
        category: values.category || 'Development',
        description: values.description || null,
        priority: 'Medium',
        estimated_time: 0,
        actual_time: 0,
        status: 'Not Started',
        progress: 0,
        approval_status: 'Not Submitted'
      };

      const { error } = await supabase.from('tasks').insert([newTask]);
      if (error) throw error;
      
      form.reset();
      setIsDialogOpen(false);
      fetchTasks();
      toast.success('Task created successfully!');
    } catch (err) {
      console.error('Error creating task', err);
      toast.error('Failed to create task');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      fetchTasks();
      toast.success('Task deleted');
    } catch (err) {
      console.error('Error deleting task', err);
      toast.error('Failed to delete task');
    }
  };

  const handleToggleComplete = async (task: Task, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: isCompleted ? 'Completed' : 'In Progress',
          progress: isCompleted ? 100 : (task.progress === 100 ? 50 : task.progress),
          completed_at: isCompleted ? new Date(selectedDate || Date.now()).toISOString() : null,
          approval_status: isCompleted ? 'Pending Review' : 'Not Submitted'
        })
        .eq('id', task.id);

      if (error) throw error;
      fetchTasks();
      toast.success(isCompleted ? 'Task marked as completed' : 'Task marked as in progress');
    } catch (err) {
      console.error('Error toggling task completion', err);
      toast.error('Failed to update task');
    }
  };

  const onReviewSubmit = async (values: ReviewFormValues) => {
    if (!user || !reviewTask) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          approval_status: values.approval_status,
          // If rejected, optionally change task status back to In Progress so they can fix it
          status: values.approval_status === 'Rejected' ? 'In Progress' : reviewTask.status,
        })
        .eq('id', reviewTask.id);

      if (error) throw error;

      toast.success(`Task marked as ${values.approval_status}!`);
      setReviewTask(null);
      fetchTasks();
    } catch (err) {
      console.error('Error saving review', err);
      toast.error('Failed to save review');
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!selectedDate) return matchesSearch;

    const createdStr = new Date(t.created_at).toISOString().split('T')[0];
    const completedStr = t.completed_at ? new Date(t.completed_at).toISOString().split('T')[0] : null;
    
    // Condition 1: Task was created on or before the selected date
    const createdOnOrBefore = createdStr <= selectedDate;
    
    // Condition 2: Task is not completed yet OR it was completed ON OR AFTER the selected date
    // (If it was completed BEFORE the selected date, it should drop off)
    const notCompletedOrCompletedLater = !completedStr || completedStr >= selectedDate;

    return matchesSearch && createdOnOrBefore && notCompletedOrCompletedLater;
  });

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'Completed': return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>;
      case 'In Progress': return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">In Progress</Badge>;
      case 'Blocked': return <Badge variant="destructive">Blocked</Badge>;
      case 'Needs Revision': return <Badge variant="outline" className="text-orange-500">Needs Revision</Badge>;
      default: return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  const getApprovalBadge = (status: Task['approval_status']) => {
    switch (status) {
      case 'Approved': return <Badge className="bg-green-500 text-white">Approved</Badge>;
      case 'Pending Review': return <Badge className="bg-yellow-500 text-white">Submitted</Badge>;
      case 'Rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="outline">Not Submitted</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage your assigned work and deliverables.</p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground whitespace-nowrap"><Calendar className="w-4 h-4 inline mr-1" />Date:</span>
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="w-auto h-9"
          />
          {selectedDate && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate('')}>
              All Time
            </Button>
          )}
        </div>

        {user?.role === 'INTERN' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <PlusCircle className="w-4 h-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
                <DialogDescription>
                  Add a new task to your tracking board.
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
                          <Input placeholder="Task name..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="Learning, Implementation..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Details of the task..." className="h-20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end pt-4">
                    <Button type="submit">Save Task</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>All Tasks</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search tasks..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="board">Board View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list">
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task Title</TableHead>
                      <TableHead>Desc</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Done</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">Loading tasks...</TableCell>
                      </TableRow>
                    ) : filteredTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No tasks found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTasks.map(task => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>
                            {task.description ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted text-lg rounded-full">📖</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                  <DialogHeader>
                                    <DialogTitle>{task.title}</DialogTitle>
                                    <DialogDescription>Task Description</DialogDescription>
                                  </DialogHeader>
                                  <div className="text-sm whitespace-pre-wrap bg-muted/30 p-4 rounded-md">{task.description}</div>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <span className="text-xs text-muted-foreground opacity-50 ml-2">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{task.category}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(task.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {user?.role === 'INTERN' ? (
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 cursor-pointer accent-primary"
                                  checked={task.status === 'Completed'}
                                  onChange={(e) => handleToggleComplete(task, e.target.checked)}
                                />
                              ) : (
                                <span className="text-sm font-medium">{task.status === 'Completed' ? 'Yes' : 'No'}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getApprovalBadge(task.approval_status)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            {user?.role === 'INTERN' && (
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                            {user?.role === 'ADMIN' && (
                              <Button 
                                variant={task.approval_status === 'Pending Review' ? 'default' : 'outline'} 
                                size="sm" 
                                onClick={() => setReviewTask(task)}
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
              </div>
            </TabsContent>

            <TabsContent value="board">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Simplified board view columns */}
                {['Not Started', 'In Progress', 'Completed'].map(columnStatus => (
                  <div key={columnStatus} className="bg-secondary/30 rounded-xl p-4 border border-border min-h-[400px]">
                    <h3 className="font-semibold text-sm mb-4 flex justify-between items-center text-foreground">
                      {columnStatus}
                      <Badge variant="secondary">
                        {filteredTasks.filter(t => t.status === columnStatus).length}
                      </Badge>
                    </h3>
                    <div className="space-y-3">
                      {filteredTasks.filter(t => t.status === columnStatus).map(task => (
                        <Card key={task.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <Badge variant="outline" className="text-[10px]">{task.category}</Badge>
                              {getApprovalBadge(task.approval_status)}
                            </div>
                            <h4 className="font-medium text-sm mb-2 leading-tight">{task.title}</h4>
                            <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
                              <span>Est: {task.estimated_time}h</span>
                              <span>{task.progress}%</span>
                            </div>
                            {user?.role === 'ADMIN' && task.approval_status === 'Pending Review' && (
                              <div className="mt-3">
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  className="w-full h-7 text-xs" 
                                  onClick={() => setReviewTask(task)}
                                >
                                  Review
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Review Modal for Admin */}
      <Dialog open={!!reviewTask} onOpenChange={(open) => !open && setReviewTask(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Review Task</DialogTitle>
            <DialogDescription>
              Evaluate the task completion and approve or reject it.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...reviewForm}>
            <form onSubmit={reviewForm.handleSubmit(onReviewSubmit)} className="space-y-4 py-4">
              <FormField
                control={reviewForm.control}
                name="approval_status"
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
              <div className="flex justify-end pt-4">
                <Button type="submit">Save Review</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
