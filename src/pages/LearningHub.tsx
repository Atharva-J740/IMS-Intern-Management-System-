import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { LearningTopic } from '../types/learning';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, GraduationCap, CheckCircle2, PlayCircle, PlusCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

const topicSchema = z.object({
  concept: z.string().min(3, "Concept must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});
type TopicFormValues = z.infer<typeof topicSchema>;

export default function LearningHub() {
  const [topics, setTopics] = useState<LearningTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();

  const form = useForm<TopicFormValues>({
    resolver: zodResolver(topicSchema),
    defaultValues: {
      concept: '',
      description: '',
    },
  });

  const fetchTopics = async () => {
    try {
      let query = supabase.from('learning_topics').select('*').order('created_at', { ascending: false });
      if (user?.role === 'INTERN') {
        query = query.eq('intern_id', user.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data) setTopics(data as LearningTopic[]);
    } catch (err) {
      console.error('Error fetching learning topics', err);
      toast.error('Failed to load learning topics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, [user]);

  const onSubmit = async (values: TopicFormValues) => {
    if (!user) return;

    try {
      const newTopic = {
        intern_id: user.id,
        concept: values.concept,
        description: values.description,
        status: 'To Learn',
        progress: 0
      };

      const { error } = await supabase.from('learning_topics').insert([newTopic]);
      if (error) throw error;
      
      form.reset();
      setIsDialogOpen(false);
      fetchTopics();
      toast.success('Learning topic added successfully!');
    } catch (err) {
      console.error('Error creating topic', err);
      toast.error('Failed to add topic');
    }
  };

  const handleToggleMastery = async (topic: LearningTopic) => {
    try {
      const isMastered = topic.status === 'Mastered';
      const newStatus = isMastered ? 'To Learn' : 'Mastered';
      const newProgress = isMastered ? 0 : 100;
      
      const { error } = await supabase
        .from('learning_topics')
        .update({ status: newStatus, progress: newProgress })
        .eq('id', topic.id);
        
      if (error) throw error;
      fetchTopics();
      toast.success(isMastered ? 'Topic marked as not completed' : 'Topic marked as completed');
    } catch (err) {
      console.error('Error toggling mastery', err);
      toast.error('Failed to update topic');
    }
  };

  const getStatusIcon = (status: LearningTopic['status']) => {
    switch (status) {
      case 'Mastered': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'Practicing': return <PlayCircle className="w-5 h-5 text-blue-500" />;
      case 'Reading': return <BookOpen className="w-5 h-5 text-yellow-500" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            Learning Hub
          </h1>
          <p className="text-muted-foreground mt-1">Track the concepts and technologies you need to master.</p>
        </div>
        {user?.role === 'INTERN' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <PlusCircle className="w-4 h-4" />
                Add Topic
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Learning Topic</DialogTitle>
                <DialogDescription>
                  Define a new concept you plan to learn and apply.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="concept"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Concept / Technology</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. React Hook Form" {...field} />
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
                          <Textarea 
                            placeholder="Why do you need to learn this?" 
                            className="h-24"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end pt-4">
                    <Button type="submit">Save Topic</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading learning topics...</div>
        ) : topics.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-muted/10 rounded-lg border border-border border-dashed">
            No learning topics found. Start adding concepts you are learning!
          </div>
        ) : (
          topics.map(topic => (
            <Card key={topic.id} className="overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-muted/30 border-b border-border">
                <div className="flex items-center gap-4">
                  {getStatusIcon(topic.status)}
                  <div>
                    <h3 className="text-lg font-semibold">{topic.concept}</h3>
                    <Badge variant="outline" className="mt-1">{topic.status}</Badge>
                    {user?.role === 'INTERN' && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          className={topic.status === 'Mastered' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}
                          onClick={() => handleToggleMastery(topic)}
                        >
                          {topic.status === 'Mastered' ? 'Completed' : 'Not Completed'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 md:mt-0 flex items-center gap-4 w-full md:w-1/3">
                  <div className="w-full">
                    <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                      <span>Progress</span>
                      <span>{topic.progress}%</span>
                    </div>
                    <Progress value={topic.progress} className="h-2" />
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <p className="text-foreground mb-4">{topic.description || 'No description provided.'}</p>
                
                <Accordion type="single" collapsible className="w-full">
                  {(topic.evidence_of_mastery || topic.application_in_project) && (
                    <AccordionItem value="application">
                      <AccordionTrigger className="text-sm font-medium">Application & Evidence</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 mt-2 p-4 bg-muted/30 rounded-lg">
                          {topic.evidence_of_mastery && (
                            <div>
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Evidence of Mastery</h4>
                              <p className="text-sm">{topic.evidence_of_mastery}</p>
                            </div>
                          )}
                          {topic.evidence_of_mastery && topic.application_in_project && <Separator />}
                          {topic.application_in_project && (
                            <div>
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Application in Project</h4>
                              <p className="text-sm">{topic.application_in_project}</p>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
