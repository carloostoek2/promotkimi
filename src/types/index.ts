// ==================== PROMPT TYPES ====================

export type Category = 'IMAGEN' | 'VIDEO' | 'TEXTO' | 'AUDIO';
export type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Tag {
  id: string;
  name: string;
  normalizedName: string;
  usageCount: number;
}

export interface PromptTag {
  promptId: string;
  tagId: string;
  tag: Tag;
}

export interface Prompt {
  id: string;
  title: string | null;
  description: string | null;
  content: string;
  category: Category | null;
  subcategory: string | null;
  metadata: Record<string, any> | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  isFavorite: boolean;
  analysisStatus: AnalysisStatus;
  analysisResult: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  tags: PromptTag[];
}

// ==================== API TYPES ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

export interface CreatePromptInput {
  content: string;
  analyzeWithAI?: boolean;
  image?: File;
}

export interface UpdatePromptInput {
  title?: string;
  description?: string;
  content?: string;
  category?: Category;
  subcategory?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface PromptFilters {
  search?: string;
  category?: Category;
  tags?: string[];
  isFavorite?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

// ==================== UI TYPES ====================

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'loading';
  message: string;
  duration?: number;
}

export interface ModalState {
  isOpen: boolean;
  type: 'create' | 'detail' | 'edit' | null;
  promptId?: string;
}

// ==================== CATEGORY CONFIG ====================

// ==================== FLOW TYPES ====================

export interface Flow {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { nodes: number };
}

export interface FlowNode {
  id: string;
  flowId: string;
  promptId: string;
  position: number;
  createdAt: string;
  prompt?: Prompt;
}

export interface FlowWithNodes extends Flow {
  nodes: FlowNode[];
}

export interface CreateFlowInput {
  name: string;
  description?: string;
}

export interface UpdateFlowInput {
  name?: string;
  description?: string;
}

export interface AddNodeInput {
  promptId: string;
  position?: number;
}

export interface ReorderNodesInput {
  nodeIds: string[];
}

// ==================== CATEGORY CONFIG ====================

export const CATEGORY_CONFIG: Record<Category, { label: string; color: string; gradient: string }> = {
  IMAGEN: {
    label: 'Imagen',
    color: '#8B5CF6',
    gradient: 'from-[#8B5CF6] to-[#A78BFA]'
  },
  VIDEO: {
    label: 'Video',
    color: '#06B6D4',
    gradient: 'from-[#06B6D4] to-[#22D3EE]'
  },
  TEXTO: {
    label: 'Texto',
    color: '#10B981',
    gradient: 'from-[#10B981] to-[#34D399]'
  },
  AUDIO: {
    label: 'Audio',
    color: '#F59E0B',
    gradient: 'from-[#F59E0B] to-[#FBBF24]'
  }
};
