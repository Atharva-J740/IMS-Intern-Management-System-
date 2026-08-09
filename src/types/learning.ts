export interface LearningTopic {
  id: string;
  intern_id: string;
  concept: string;
  description: string | null;
  status: 'Not Started' | 'Reading' | 'Practicing' | 'Mastered' | string;
  progress: number;
  evidence_of_mastery: string | null;
  application_in_project: string | null;
  created_at: string;
}

export interface Deliverable {
  id: string;
  intern_id: string;
  task_id: string | null;
  title: string;
  type: 'PR' | 'Document' | 'Script' | 'Diagram' | 'Other' | string;
  url: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | string;
  feedback: string | null;
  submitted_date: string;
}
