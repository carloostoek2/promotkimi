import { create } from 'zustand';
import type { Flow, FlowWithNodes, CreateFlowInput, UpdateFlowInput, AddNodeInput, ReorderNodesInput } from '@/types';
import * as api from '@/services/api';

interface FlowState {
  flows: Flow[];
  selectedFlow: FlowWithNodes | null;
  isLoading: boolean;
  error: string | null;

  fetchFlows: (promptId?: string) => Promise<void>;
  fetchFlowById: (id: string) => Promise<void>;
  createFlow: (input: CreateFlowInput) => Promise<void>;
  updateFlow: (id: string, input: UpdateFlowInput) => Promise<void>;
  deleteFlow: (id: string) => Promise<void>;
  addNodeToFlow: (flowId: string, input: AddNodeInput) => Promise<void>;
  reorderNodes: (flowId: string, input: ReorderNodesInput) => Promise<void>;
  removeNodeFromFlow: (flowId: string, nodeId: string) => Promise<void>;
  selectFlow: (flow: FlowWithNodes | null) => void;
  clearError: () => void;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  flows: [],
  selectedFlow: null,
  isLoading: false,
  error: null,

  fetchFlows: async (promptId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const flows = await api.getFlows(promptId);
      set({ flows, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error cargando flujos',
        isLoading: false,
      });
    }
  },

  fetchFlowById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const flow = await api.getFlowById(id);
      set({ selectedFlow: flow, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error cargando flujo',
        isLoading: false,
      });
    }
  },

  createFlow: async (input: CreateFlowInput) => {
    set({ isLoading: true, error: null });
    try {
      await api.createFlow(input);
      await get().fetchFlows();
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error creando flujo',
        isLoading: false,
      });
      throw error;
    }
  },

  updateFlow: async (id: string, input: UpdateFlowInput) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await api.updateFlow(id, input);
      set(state => ({
        flows: state.flows.map(f => f.id === id ? updated : f),
        selectedFlow: state.selectedFlow?.id === id
          ? { ...state.selectedFlow, ...updated }
          : state.selectedFlow,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error actualizando flujo',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteFlow: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteFlow(id);
      set(state => ({
        flows: state.flows.filter(f => f.id !== id),
        selectedFlow: state.selectedFlow?.id === id ? null : state.selectedFlow,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error eliminando flujo',
        isLoading: false,
      });
      throw error;
    }
  },

  addNodeToFlow: async (flowId: string, input: AddNodeInput) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await api.addNodeToFlow(flowId, input);
      set(state => ({
        selectedFlow: state.selectedFlow?.id === flowId ? updated : state.selectedFlow,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error agregando nodo',
        isLoading: false,
      });
      throw error;
    }
  },

  reorderNodes: async (flowId: string, input: ReorderNodesInput) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await api.reorderNodes(flowId, input);
      set(state => ({
        selectedFlow: state.selectedFlow?.id === flowId ? updated : state.selectedFlow,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error reordenando nodos',
        isLoading: false,
      });
      throw error;
    }
  },

  removeNodeFromFlow: async (flowId: string, nodeId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.removeNodeFromFlow(flowId, nodeId);
      set(state => ({
        selectedFlow: state.selectedFlow
          ? {
              ...state.selectedFlow,
              nodes: state.selectedFlow.nodes.filter(n => n.id !== nodeId),
            }
          : null,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error eliminando nodo',
        isLoading: false,
      });
      throw error;
    }
  },

  selectFlow: (flow: FlowWithNodes | null) => {
    set({ selectedFlow: flow });
  },

  clearError: () => {
    set({ error: null });
  },
}));
