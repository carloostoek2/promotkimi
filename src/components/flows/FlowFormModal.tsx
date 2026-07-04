import { useEffect, useState, useCallback } from 'react';
import { X, Search, Plus, ChevronUp, ChevronDown, Trash2, GitBranch, Loader2, Image as ImageIcon } from 'lucide-react';
import { useFlowStore } from '@/stores/flowStore';
import { useUIStore } from '@/stores/uiStore';
import { usePromptStore } from '@/stores/promptStore';
import type { Prompt } from '@/types';

export function FlowFormModal() {
  const {
    selectedFlow,
    fetchFlowById,
    createFlow,
    updateFlow,
    addNodeToFlow,
    removeNodeFromFlow,
    reorderNodes,
  } = useFlowStore();
  const { prompts, fetchPrompts } = usePromptStore();
  const {
    flowFormModalOpen,
    closeFlowFormModal,
    selectedFlowId,
    showSuccess,
    showError,
    showLoading,
    removeToast,
  } = useUIStore();

  const isEdit = !!selectedFlowId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (flowFormModalOpen) {
      fetchPrompts(true);
      if (isEdit && selectedFlowId) {
        fetchFlowById(selectedFlowId);
      } else {
        setName('');
        setDescription('');
      }
    }
  }, [flowFormModalOpen, isEdit, selectedFlowId, fetchFlowById, fetchPrompts]);

  useEffect(() => {
    if (selectedFlow && isEdit) {
      setName(selectedFlow.name);
      setDescription(selectedFlow.description || '');
    }
  }, [selectedFlow, isEdit]);

  const filteredPrompts = searchQuery.trim()
    ? prompts.filter(p => {
        const q = searchQuery.toLowerCase();
        return (
          (p.title?.toLowerCase().includes(q)) ||
          p.content.toLowerCase().includes(q)
        );
      })
    : prompts.slice(0, 20);

  const handleSubmit = async () => {
    if (!name.trim()) {
      showError('El nombre del flujo es requerido');
      return;
    }

    setIsSubmitting(true);
    const toastId = showLoading(isEdit ? 'Actualizando flujo...' : 'Creando flujo...');

    try {
      if (isEdit && selectedFlowId) {
        await updateFlow(selectedFlowId, { name: name.trim(), description: description.trim() || undefined });
      } else {
        await createFlow({ name: name.trim(), description: description.trim() || undefined });
      }
      removeToast(toastId);
      showSuccess(isEdit ? 'Flujo actualizado' : 'Flujo creado exitosamente');
      closeFlowFormModal();
    } catch {
      removeToast(toastId);
      showError('Error guardando flujo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPrompt = useCallback(async (prompt: Prompt) => {
    if (!selectedFlow) return;
    try {
      await addNodeToFlow(selectedFlow.id, { promptId: prompt.id });
      setPickerOpen(false);
      setSearchQuery('');
    } catch {
      showError('Error agregando prompt al flujo');
    }
  }, [selectedFlow, addNodeToFlow, showError]);

  const handleRemoveNode = useCallback(async (nodeId: string) => {
    if (!selectedFlow) return;
    try {
      await removeNodeFromFlow(selectedFlow.id, nodeId);
      await fetchFlowById(selectedFlow.id);
    } catch {
      showError('Error eliminando nodo');
    }
  }, [selectedFlow, removeNodeFromFlow, fetchFlowById, showError]);

  const handleMoveUp = useCallback(async (index: number) => {
    if (!selectedFlow || index === 0) return;
    const nodeIds = selectedFlow.nodes.map(n => n.id);
    [nodeIds[index - 1], nodeIds[index]] = [nodeIds[index], nodeIds[index - 1]];
    try {
      await reorderNodes(selectedFlow.id, { nodeIds });
    } catch {
      showError('Error reordenando nodos');
    }
  }, [selectedFlow, reorderNodes, showError]);

  const handleMoveDown = useCallback(async (index: number) => {
    if (!selectedFlow || index >= selectedFlow.nodes.length - 1) return;
    const nodeIds = selectedFlow.nodes.map(n => n.id);
    [nodeIds[index], nodeIds[index + 1]] = [nodeIds[index + 1], nodeIds[index]];
    try {
      await reorderNodes(selectedFlow.id, { nodeIds });
    } catch {
      showError('Error reordenando nodos');
    }
  }, [selectedFlow, reorderNodes, showError]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeFlowFormModal();
    }
  };

  if (!flowFormModalOpen) return null;

  return (
    <div
      className="modal-backdrop flex items-end md:items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="modal-content animate-modal-enter max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A3A]">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#8B5CF6]" />
            <h2 className="text-lg font-semibold text-white">
              {isEdit ? 'Editar Flujo' : 'Nuevo Flujo'}
            </h2>
          </div>
          <button
            onClick={closeFlowFormModal}
            className="p-2 rounded-lg text-[#71717A] hover:text-white hover:bg-[#1A1A24] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
              Nombre del flujo
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Flujo de generación de imágenes"
              className="input-dark"
              maxLength={200}
              disabled={isSubmitting}
            />
            <span className="text-xs text-[#52525B] mt-1 block text-right">
              {name.length}/200
            </span>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
              Descripción (opcional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe el propósito de este flujo..."
              className="textarea-dark min-h-[80px]"
              disabled={isSubmitting}
            />
          </div>

          {/* Nodes (edit mode only) */}
          {isEdit && selectedFlow && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[#A1A1AA]">
                  Prompts en el flujo
                </h3>
                <span className="text-xs text-[#52525B] tabular-nums">
                  {selectedFlow.nodes.length}
                </span>
              </div>

              {selectedFlow.nodes.length === 0 ? (
                <p className="text-sm text-[#71717A] text-center py-4">
                  No hay prompts en este flujo. Agrega uno a continuación.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedFlow.nodes.map((node, index) => {
                    const prompt = node.prompt;
                    return (
                      <div
                        key={node.id}
                        className="flow-node-card flex items-center gap-3"
                      >
                        <div className="flow-position-badge">
                          {index + 1}
                        </div>

                        {/* Prompt preview */}
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          {prompt?.thumbnailUrl ? (
                            <img
                              src={prompt.thumbnailUrl}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#1A1A24] flex items-center justify-center flex-shrink-0">
                              <ImageIcon className="w-5 h-5 text-[#3A3A4A]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate">
                              {prompt?.title || 'Sin título'}
                            </p>
                            <p className="text-xs text-[#71717A] truncate">
                              {prompt?.content.slice(0, 60)}
                            </p>
                          </div>
                        </div>

                        {/* Reorder + Remove */}
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="p-1 rounded text-[#71717A] hover:text-white hover:bg-[#1A1A24]
                                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label="Mover arriba"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === selectedFlow.nodes.length - 1}
                            className="p-1 rounded text-[#71717A] hover:text-white hover:bg-[#1A1A24]
                                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label="Mover abajo"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleRemoveNode(node.id)}
                          className="p-2 rounded-lg text-[#71717A] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors flex-shrink-0"
                          aria-label="Eliminar nodo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add prompt section */}
              {!pickerOpen ? (
                <button
                  onClick={() => setPickerOpen(true)}
                  className="w-full py-3 border-2 border-dashed border-[#2A2A3A] rounded-xl
                             text-[#71717A] hover:text-white hover:border-[#3A3A4A]
                             transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Agregar prompt
                </button>
              ) : (
                <div className="space-y-3 p-3 bg-[#1A1A24] rounded-xl">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#71717A] flex-shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Buscar prompts..."
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71717A] outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => { setPickerOpen(false); setSearchQuery(''); }}
                      className="text-xs text-[#8B5CF6] hover:underline flex-shrink-0"
                    >
                      Cerrar
                    </button>
                  </div>

                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {filteredPrompts.length === 0 ? (
                      <p className="text-sm text-[#71717A] text-center py-4">
                        No se encontraron prompts
                      </p>
                    ) : (
                      filteredPrompts.map(prompt => (
                        <button
                          key={prompt.id}
                          onClick={() => handleAddPrompt(prompt)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg
                                     hover:bg-[#12121A] transition-colors text-left"
                        >
                          {prompt.thumbnailUrl ? (
                            <img
                              src={prompt.thumbnailUrl}
                              alt=""
                              className="w-9 h-9 rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded bg-[#12121A] flex items-center justify-center flex-shrink-0">
                              <ImageIcon className="w-4 h-4 text-[#3A3A4A]" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white truncate">
                              {prompt.title || 'Sin título'}
                            </p>
                            <p className="text-xs text-[#71717A] truncate">
                              {prompt.content.slice(0, 40)}
                            </p>
                          </div>
                          <Plus className="w-4 h-4 text-[#8B5CF6] flex-shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2A2A3A] space-y-2">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : null}
            {isEdit ? 'Guardar Cambios' : 'Crear Flujo'}
          </button>
          <button
            onClick={closeFlowFormModal}
            disabled={isSubmitting}
            className="btn-secondary w-full disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
