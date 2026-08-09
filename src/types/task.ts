export interface Task {
  id: string;
  intern_id: string;
  title: string;
  description: string | null;
  category: 'Development' | 'Documentation' | 'Review' | 'Testing' | 'Other' | string;
  priority: 'High' | 'Medium' | 'Low' | string;
  estimated_time: number;
  actual_time: number;
  status: 'Not Started' | 'In Progress' | 'In Review' | 'Completed' | string;
  progress: number;
  due_date?: string;
  completed_at?: string;
  approval_status: 'Not Submitted' | 'Pending Review' | 'Approved' | 'Rejected';
  created_at: string;
}

export interface ProgressLog {
  id: string;
  intern_id: string;
  task_id: string;
  log_date: string;
  time_spent: number;
  what_did_you_do: string | null;
  outcome: string | null;
  evidence_url: string | null;
  created_at: string;
}
