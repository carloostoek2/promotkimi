import { create } from 'zustand';
import type { Toast } from '@/types';

interface UIState {
  // Modals
  createModalOpen: boolean;
  detailModalOpen: boolean;
  editModalOpen: boolean;
  selectedPromptId: string | null;

  // Flow modals
  flowListModalOpen: boolean;
  flowViewModalOpen: boolean;
  flowFormModalOpen: boolean;
  selectedFlowId: string | null;

  // Toasts
  toasts: Toast[];

  // Filter panel
  filterPanelOpen: boolean;

  // View mode
  viewMode: 'list' | 'mosaic';

  // Actions
  openCreateModal: () => void;
  closeCreateModal: () => void;

  openDetailModal: (promptId: string) => void;
  closeDetailModal: () => void;
  setSelectedPromptId: (promptId: string) => void;

  openEditModal: (promptId: string) => void;
  closeEditModal: () => void;

  // Flow modal actions
  openFlowListModal: () => void;
  closeFlowListModal: () => void;
  openFlowViewModal: (flowId: string) => void;
  closeFlowViewModal: () => void;
  openFlowFormModal: (flowId?: string) => void;
  closeFlowFormModal: () => void;

  toggleFilterPanel: () => void;
  closeFilterPanel: () => void;

  // View mode actions
  setViewMode: (mode: 'list' | 'mosaic') => void;
  toggleViewMode: () => void;

  // Toast actions
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;

  // Helper toast methods
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showLoading: (message: string) => string;
  updateToast: (id: string, updates: Partial<Toast>) => void;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  createModalOpen: false,
  detailModalOpen: false,
  editModalOpen: false,
  selectedPromptId: null,
  flowListModalOpen: false,
  flowViewModalOpen: false,
  flowFormModalOpen: false,
  selectedFlowId: null,
  toasts: [],
  filterPanelOpen: false,
  viewMode: 'list',

  // Create modal
  openCreateModal: () => set({ createModalOpen: true }),
  closeCreateModal: () => set({ createModalOpen: false }),

  // Detail modal
  openDetailModal: (promptId: string) => set({ 
    detailModalOpen: true, 
    selectedPromptId: promptId 
  }),
  closeDetailModal: () => set({
    detailModalOpen: false,
    selectedPromptId: null
  }),
  setSelectedPromptId: (promptId: string) => set({ selectedPromptId: promptId }),

  // Edit modal
  openEditModal: (promptId: string) => set({ 
    editModalOpen: true, 
    selectedPromptId: promptId 
  }),
  closeEditModal: () => set({
    editModalOpen: false,
    selectedPromptId: null
  }),

  // Flow modals
  openFlowListModal: () => set({ flowListModalOpen: true }),
  closeFlowListModal: () => set({ flowListModalOpen: false }),

  openFlowViewModal: (flowId: string) => set({
    flowViewModalOpen: true,
    selectedFlowId: flowId,
  }),
  closeFlowViewModal: () => set({
    flowViewModalOpen: false,
    selectedFlowId: null,
  }),

  openFlowFormModal: (flowId?: string) => set({
    flowFormModalOpen: true,
    selectedFlowId: flowId || null,
  }),
  closeFlowFormModal: () => set({
    flowFormModalOpen: false,
    selectedFlowId: null,
  }),

  // Filter panel
  toggleFilterPanel: () => set(state => ({ filterPanelOpen: !state.filterPanelOpen })),
  closeFilterPanel: () => set({ filterPanelOpen: false }),

  // View mode
  setViewMode: (viewMode) => set({ viewMode }),
  toggleViewMode: () => set(state => ({ viewMode: state.viewMode === 'list' ? 'mosaic' : 'list' })),

  // Toast actions
  addToast: (toast): string => {
    const id = generateId();
    const newToast: Toast = { ...toast, id };
    
    set(state => ({
      toasts: [...state.toasts, newToast]
    }));

    // Auto-remove after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, toast.duration || 3000);
    }

    return id;
  },

  removeToast: (id: string) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }));
  },

  // Helper toast methods
  showSuccess: (message: string) => {
    get().addToast({ type: 'success', message, duration: 3000 });
  },

  showError: (message: string) => {
    get().addToast({ type: 'error', message, duration: 5000 });
  },

  showInfo: (message: string) => {
    get().addToast({ type: 'info', message, duration: 3000 });
  },

  showLoading: (message: string): string => {
    return get().addToast({ type: 'loading', message, duration: 0 });
  },

  updateToast: (id: string, updates: Partial<Toast>) => {
    set(state => ({
      toasts: state.toasts.map(t => 
        t.id === id ? { ...t, ...updates } : t
      )
    }));
  },
}));
