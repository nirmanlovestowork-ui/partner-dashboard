export type Assignee = 'BIBHU' | 'ADMIN';

export interface Task {
  task_id: string;
  task_name: string;
  due_date: string;
  status: boolean;
  assignee: Assignee;
}
