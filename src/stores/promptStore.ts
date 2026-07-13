import { create } from 'zustand';
import type { Prompt, PromptFilters, CreatePromptInput, UpdatePromptInput } from '@/types';
import * as api from '@/services/api';

interface PromptState {
  // Data
  prompts: Prompt[];
  selectedPrompt: Prompt | null;
  isLoading: boolean;
  error: string | null;
  
  // Filters
  filters: PromptFilters;
  
  // Actions
  fetchPrompts: (silent?: boolean) => Promise<void>;
  fetchPromptById: (id: string) => Promise<void>;
  createPrompt: (input: CreatePromptInput) => Promise<void>;
  updatePrompt: (id: string, input: UpdatePromptInput) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  restorePromptVersion: (id: string, version: number) => Promise<Prompt>;

  // Filter actions
  setFilters: (filters: Partial<PromptFilters>) => void;
  resetFilters: () => void;
  
  // Selection
  selectPrompt: (prompt: Prompt | null) => void;
  
  // Utils
  clearError: () => void;
}

const defaultFilters: PromptFilters = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export const usePromptStore = create<PromptState>((set, get) => ({
  // Initial state
  prompts: [],
  selectedPrompt: null,
  isLoading: false,
  error: null,
  filters: defaultFilters,

  // Fetch all prompts
  fetchPrompts: async (silent = false) => {
    if (!silent) set({ isLoading: true, error: null });
    try {
      const prompts = await api.getPrompts(get().filters);
      set({ prompts, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error cargando prompts',
        isLoading: false
      });
    }
  },

  // Fetch single prompt
  fetchPromptById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const prompt = await api.getPromptById(id);
      set({ selectedPrompt: prompt, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Error cargando prompt',
        isLoading: false 
      });
    }
  },

  // Create prompt
  createPrompt: async (input: CreatePromptInput) => {
    set({ isLoading: true, error: null });
    try {
      await api.createPrompt(input);
      await get().fetchPrompts();
      set({ isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Error creando prompt',
        isLoading: false 
      });
      throw error;
    }
  },

  // Update prompt
  updatePrompt: async (id: string, input: UpdatePromptInput) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await api.updatePrompt(id, input);
      set(state => ({
        prompts: state.prompts.map(p => p.id === id ? updated : p),
        selectedPrompt: state.selectedPrompt?.id === id ? updated : state.selectedPrompt,
        isLoading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Error actualizando prompt',
        isLoading: false 
      });
      throw error;
    }
  },

  // Delete prompt
  deletePrompt: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.deletePrompt(id);
      set(state => ({
        prompts: state.prompts.filter(p => p.id !== id),
        selectedPrompt: state.selectedPrompt?.id === id ? null : state.selectedPrompt,
        isLoading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Error eliminando prompt',
        isLoading: false 
      });
      throw error;
    }
  },

  // Toggle favorite
  toggleFavorite: async (id: string) => {
    try {
      const updated = await api.toggleFavorite(id);
      set(state => ({
        prompts: state.prompts.map(p => p.id === id ? updated : p),
        selectedPrompt: state.selectedPrompt?.id === id ? updated : state.selectedPrompt,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Error actualizando favorito'
      });
    }
  },

  // Restore a historical version onto the live head (does not set isLoading /
  // analysis spinner — restore never re-queues AI).
  restorePromptVersion: async (id: string, version: number) => {
    try {
      const updated = await api.restorePromptVersion(id, version);
      set(state => ({
        prompts: state.prompts.map(p => (p.id === id ? updated : p)),
        selectedPrompt:
          state.selectedPrompt?.id === id ? updated : state.selectedPrompt,
        error: null,
      }));
      return updated;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Error restaurando versión',
      });
      throw error;
    }
  },

  // Set filters
  setFilters: (filters: Partial<PromptFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...filters }
    }));
  },

  // Reset filters
  resetFilters: () => {
    set({
      filters: {
        ...defaultFilters,
        intent: undefined,
        target: undefined,
        inputMode: undefined,
        preservation: undefined,
      },
    });
  },

  // Select prompt
  selectPrompt: (prompt: Prompt | null) => {
    set({ selectedPrompt: prompt });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
