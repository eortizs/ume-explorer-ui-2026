export interface Lifecycle {
  state: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export interface UmeEntity {
  id: string;
  name: string;
  type: string;
  tenant: string;
  lifecycle: Lifecycle;
  properties: Record<string, unknown>;
  markdown: string;
}

export interface Relationship {
  targetId: string;
  targetType: string;
  role: string;
  direction: 'outgoing' | 'incoming';
  properties: Record<string, unknown> | null;
  targetEntity: UmeEntity | null;
}

export interface SubtreeNode {
  id: string;
  type: string;
  name: string;
  depth: number;
  parentId: string | null;
}

export interface TreeNode {
  id: string;
  name: string;
  type: string;
  properties: Record<string, unknown>;
  children: TreeNode[];
}

export interface JournalEntry {
  id: string;
  name: string;
  type: string;
  markdown: string;
  properties: Record<string, unknown>;
  lifecycle: Lifecycle;
}

export interface ManageError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ManageOk<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ManageFail {
  success: false;
  error: ManageError;
}

export type ManageResponse<T> = ManageOk<T> | ManageFail;