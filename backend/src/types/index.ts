import {
  Category,
  AnalysisStatus,
  ImageIntent,
  ImageTarget,
  InputMode,
  Preservation,
} from '@prisma/client';

// ==================== PROMPT TYPES ====================

export interface CreatePromptInput {
  content: string;
  analyzeWithAI?: boolean;
}

export interface UpdatePromptInput {
  title?: string;
  description?: string;
  content?: string;
  category?: Category;
  subcategory?: string | null;
  intent?: ImageIntent | null;
  targets?: ImageTarget[];
  inputMode?: InputMode | null;
  preservation?: Preservation | null;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface PromptFilters {
  search?: string;
  category?: Category;
  tags?: string[];
  isFavorite?: boolean;
  intent?: ImageIntent;
  target?: ImageTarget;
  inputMode?: InputMode;
  preservation?: Preservation;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

// ==================== ANALYSIS TYPES ====================

export interface AnalysisResult {
  title: string;
  description: string;
  category: Category;
  subcategory: string | null;
  intent?: ImageIntent | null;
  targets?: ImageTarget[];
  inputMode?: InputMode | null;
  preservation?: Preservation | null;
  tags: string[];
  metadata: Record<string, any>;
  confidence: number;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/** @deprecated Use ChatCompletionResponse */
export type OpenRouterResponse = ChatCompletionResponse;

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ==================== FILE UPLOAD TYPES ====================

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

// ==================== TAG TYPES ====================

export interface TagInput {
  name: string;
}

export interface TagSuggestion {
  name: string;
  normalizedName: string;
  usageCount: number;
}

// ==================== FLOW TYPES ====================

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
