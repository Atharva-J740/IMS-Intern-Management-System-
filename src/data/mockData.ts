export const mockInternMetrics = {
  efficiency: 85,
  tasksCompleted: 12,
  pendingTasks: 4,
  awaitingApproval: 2,
  tangibleOutputs: 5,
  learningHours: 14,
  approvedWork: 10,
  currentStreak: 5,
  internshipDay: 14,
};

export const mockRecentActivity = [
  {
    id: 1,
    time: '09:00 AM',
    activity: 'Studied React Query architecture',
    category: 'Learning',
    duration: '2h',
    result: 'Completed Chapter 4',
    status: 'Approved'
  },
  {
    id: 2,
    time: '11:15 AM',
    activity: 'Implemented Data Fetching Hook',
    category: 'Implementation',
    duration: '1.5h',
    result: 'useUsers.ts script',
    status: 'Pending'
  },
  {
    id: 3,
    time: '02:00 PM',
    activity: 'Reviewed PR for Dashboard Layout',
    category: 'Review',
    duration: '1h',
    result: 'Approved PR #12',
    status: 'Approved'
  }
];

export const mockEfficiencyData = [
  { name: 'Mon', efficiency: 65, tasks: 4 },
  { name: 'Tue', efficiency: 75, tasks: 5 },
  { name: 'Wed', efficiency: 82, tasks: 6 },
  { name: 'Thu', efficiency: 90, tasks: 8 },
  { name: 'Fri', efficiency: 85, tasks: 7 },
];
