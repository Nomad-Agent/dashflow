export type UserRead = {
  id: string;
  email: string;
  name: string;
};

export type WorkspaceRead = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

export type ProjectRead = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TaskRead = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  assignee_id: string | null;
  created_by_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};
