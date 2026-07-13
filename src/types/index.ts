// ==================== PROMPT TYPES ====================

export type Category = 'IMAGEN' | 'VIDEO' | 'TEXTO' | 'AUDIO';
export type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type ImageIntent =
  | 'GENERAR'
  | 'MEJORAR_REALISMO'
  | 'TRANSFORMAR'
  | 'RETOQUE'
  | 'COMPONER'
  | 'DEFINIR_IDENTIDAD'
  | 'MODIFICAR_POSE';

export type ImageTarget =
  | 'ROSTRO'
  | 'PIEL'
  | 'CUERPO'
  | 'ILUMINACION'
  | 'ESCENA_COMPLETA'
  | 'ROPA_TEXTURA';

export type InputMode = 'TEXTO_A_IMAGEN' | 'IMAGEN_A_IMAGEN' | 'MULTI_IMAGEN';

export type Preservation = 'IDENTIDAD' | 'COMPOSICION' | 'LIBRE';

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
  intent: ImageIntent | null;
  targets: ImageTarget[];
  inputMode: InputMode | null;
  preservation: Preservation | null;
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

// ==================== VERSION TYPES ====================

export type VersionChangeReason =
  | 'CREATE'
  | 'UPDATE'
  | 'IMAGE'
  | 'ANALYSIS'
  | 'RESTORE';

export interface VersionSummary {
  version: number;
  createdAt: string;
  changeReason: VersionChangeReason;
  title: string | null;
}

export interface PromptVersionDetail extends VersionSummary {
  description: string | null;
  content: string;
  category: Category | null;
  subcategory: string | null;
  intent: ImageIntent | null;
  targets: ImageTarget[];
  inputMode: InputMode | null;
  preservation: Preservation | null;
  metadata: Record<string, unknown> | null;
  tags: string[];
  imageUrl: string | null;
  thumbnailUrl: string | null;
  analysisResult: Record<string, unknown> | null;
}

export const VERSION_CHANGE_REASON_CONFIG: Record<
  VersionChangeReason,
  { label: string }
> = {
  CREATE: { label: 'Creación' },
  UPDATE: { label: 'Edición' },
  IMAGE: { label: 'Imagen' },
  ANALYSIS: { label: 'Análisis' },
  RESTORE: { label: 'Restauración' },
};

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
  intent?: ImageIntent;
  target?: ImageTarget;
  inputMode?: InputMode;
  preservation?: Preservation;
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

export const INTENT_CONFIG: Record<ImageIntent, { label: string; color: string; gradient: string }> = {
  GENERAR: {
    label: 'Generar',
    color: '#8B5CF6',
    gradient: 'from-[#8B5CF6] to-[#A78BFA]',
  },
  MEJORAR_REALISMO: {
    label: 'Mejorar realismo',
    color: '#06B6D4',
    gradient: 'from-[#06B6D4] to-[#22D3EE]',
  },
  TRANSFORMAR: {
    label: 'Transformar',
    color: '#F59E0B',
    gradient: 'from-[#F59E0B] to-[#FBBF24]',
  },
  RETOQUE: {
    label: 'Retoque',
    color: '#EC4899',
    gradient: 'from-[#EC4899] to-[#F472B6]',
  },
  COMPONER: {
    label: 'Componer',
    color: '#10B981',
    gradient: 'from-[#10B981] to-[#34D399]',
  },
  DEFINIR_IDENTIDAD: {
    label: 'Definir identidad',
    color: '#6366F1',
    gradient: 'from-[#6366F1] to-[#818CF8]',
  },
  MODIFICAR_POSE: {
    label: 'Modificar pose',
    color: '#EF4444',
    gradient: 'from-[#EF4444] to-[#F87171]',
  },
};

export const TARGET_CONFIG: Record<ImageTarget, { label: string }> = {
  ROSTRO: { label: 'Rostro' },
  PIEL: { label: 'Piel' },
  CUERPO: { label: 'Cuerpo' },
  ILUMINACION: { label: 'Iluminación' },
  ESCENA_COMPLETA: { label: 'Escena completa' },
  ROPA_TEXTURA: { label: 'Ropa y textura' },
};

export const INPUT_MODE_CONFIG: Record<InputMode, { label: string }> = {
  TEXTO_A_IMAGEN: { label: 'Texto a imagen' },
  IMAGEN_A_IMAGEN: { label: 'Imagen a imagen' },
  MULTI_IMAGEN: { label: 'Multi imagen' },
};

export const PRESERVATION_CONFIG: Record<Preservation, { label: string }> = {
  IDENTIDAD: { label: 'Identidad' },
  COMPOSICION: { label: 'Composición' },
  LIBRE: { label: 'Libre' },
};

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
