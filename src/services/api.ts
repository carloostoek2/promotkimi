import type { Prompt, CreatePromptInput, UpdatePromptInput, PromptFilters, ApiResponse, Tag, Flow, FlowWithNodes, CreateFlowInput, UpdateFlowInput, AddNodeInput, ReorderNodesInput } from '@/types';

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

// ==================== HELPER FUNCTIONS ====================

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `Error ${response.status}`);
  }

  return response.json();
}

// ==================== PROMPT API ====================

export async function getPrompts(filters: PromptFilters = {}): Promise<Prompt[]> {
  const params = new URLSearchParams();
  
  if (filters.search) params.append('search', filters.search);
  if (filters.category) params.append('category', filters.category);
  if (filters.tags?.length) params.append('tags', filters.tags.join(','));
  if (filters.isFavorite !== undefined) params.append('isFavorite', String(filters.isFavorite));
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

  const response = await fetchApi<Prompt[]>(`/api/prompts?${params}`);
  return response.data || [];
}

export async function getPromptById(id: string): Promise<Prompt> {
  const response = await fetchApi<Prompt>(`/api/prompts/${id}`);
  if (!response.data) throw new Error('Prompt no encontrado');
  return response.data;
}

export async function createPrompt(input: CreatePromptInput): Promise<Prompt> {
  const formData = new FormData();
  formData.append('content', input.content);
  formData.append('analyzeWithAI', String(input.analyzeWithAI ?? true));
  
  if (input.image) {
    formData.append('image', input.image);
  }

  const response = await fetchApi<Prompt>('/api/prompts', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.data) throw new Error('Error creando prompt');
  return response.data;
}

export async function updatePrompt(id: string, input: UpdatePromptInput): Promise<Prompt> {
  const response = await fetchApi<Prompt>(`/api/prompts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  
  if (!response.data) throw new Error('Error actualizando prompt');
  return response.data;
}

export async function deletePrompt(id: string): Promise<void> {
  await fetchApi<void>(`/api/prompts/${id}`, {
    method: 'DELETE',
  });
}

export async function toggleFavorite(id: string): Promise<Prompt> {
  const response = await fetchApi<Prompt>(`/api/prompts/${id}/favorite`, {
    method: 'POST',
  });
  
  if (!response.data) throw new Error('Error toggling favorite');
  return response.data;
}

export async function updatePromptImage(id: string, image: File): Promise<Prompt> {
  const formData = new FormData();
  formData.append('image', image);

  const response = await fetchApi<Prompt>(`/api/prompts/${id}/image`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.data) throw new Error('Error actualizando imagen');
  return response.data;
}

// ==================== TAG API ====================

export async function getTags(): Promise<Tag[]> {
  const response = await fetchApi<Tag[]>('/api/tags');
  return response.data || [];
}

export async function getTagSuggestions(query: string, limit = 10): Promise<Tag[]> {
  const response = await fetchApi<Tag[]>(`/api/tags/suggest?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data || [];
}

// ==================== HEALTH CHECK ====================

// ==================== FLOW API ====================

export async function getFlows(promptId?: string): Promise<Flow[]> {
  const params = promptId ? `?promptId=${encodeURIComponent(promptId)}` : '';
  const response = await fetchApi<Flow[]>(`/api/flows${params}`);
  return response.data || [];
}

export async function getFlowById(id: string): Promise<FlowWithNodes> {
  const response = await fetchApi<FlowWithNodes>(`/api/flows/${id}`);
  if (!response.data) throw new Error('Flujo no encontrado');
  return response.data;
}

export async function createFlow(input: CreateFlowInput): Promise<Flow> {
  const response = await fetchApi<Flow>('/api/flows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.data) throw new Error('Error creando flujo');
  return response.data;
}

export async function updateFlow(id: string, input: UpdateFlowInput): Promise<Flow> {
  const response = await fetchApi<Flow>(`/api/flows/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.data) throw new Error('Error actualizando flujo');
  return response.data;
}

export async function deleteFlow(id: string): Promise<void> {
  await fetchApi<void>(`/api/flows/${id}`, { method: 'DELETE' });
}

export async function addNodeToFlow(flowId: string, input: AddNodeInput): Promise<FlowWithNodes> {
  const response = await fetchApi<FlowWithNodes>(`/api/flows/${flowId}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.data) throw new Error('Error agregando nodo');
  return response.data;
}

export async function reorderNodes(flowId: string, input: ReorderNodesInput): Promise<FlowWithNodes> {
  const response = await fetchApi<FlowWithNodes>(`/api/flows/${flowId}/nodes/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.data) throw new Error('Error reordenando nodos');
  return response.data;
}

export async function removeNodeFromFlow(flowId: string, nodeId: string): Promise<void> {
  await fetchApi<void>(`/api/flows/${flowId}/nodes/${nodeId}`, { method: 'DELETE' });
}

// ==================== HEALTH CHECK ====================

export async function healthCheck(): Promise<{ success: boolean; message: string }> {
  const response = await fetchApi<{ message: string }>('/health');
  return {
    success: response.success,
    message: response.data?.message || 'OK'
  };
}
