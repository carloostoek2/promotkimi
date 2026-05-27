import { Category, AnalysisStatus } from '@prisma/client';

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

// ==================== ANALYSIS TYPES ====================

export interface AnalysisResult {
  title: string;
  description: string;
  category: Category;
  subcategory: string;
  tags: string[];
  metadata: Record<string, any>;
  confidence: number;
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

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
