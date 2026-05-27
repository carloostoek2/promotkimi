import { useEffect, useRef, useCallback } from 'react';
import { X, GitBranch, Pencil, Loader2, Image as ImageIcon, ChevronRight } from 'lucide-react';
import { useFlowStore } from '@/stores/flowStore';
import { useUIStore } from '@/stores/uiStore';
import { CATEGORY_CONFIG } from '@/types';
import type { Category } from '@/types';

export function FlowViewModal() {
  const { selectedFlow, isLoading, fetchFlowById } = useFlowStore();
  const {
    flowViewModalOpen,
    closeFlowViewModal,
    selectedFlowId,
    openDetailModal,
    openFlowFormModal,
    closeDetailModal,
  } = useUIStore();

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (flowViewModalOpen && selectedFlowId) {
      fetchFlowById(selectedFlowId);
    }
  }, [flowViewModalOpen, selectedFlowId, fetchFlowById]);

  const handleNodeTap = useCallback((promptId: string) => {
    openDetailModal(promptId);
  }, [openDetailModal]);

  const handleEdit = useCallback(() => {
    if (!selectedFlow) return;
    closeFlowViewModal();
    setTimeout(() => openFlowFormModal(selectedFlow.id), 150);
  }, [selectedFlow, closeFlowViewModal, openFlowFormModal]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeFlowViewModal();
    }
  };

  const getCategoryColor = (category: Category | null): string => {
    if (!category) return '#3A3A4A';
    return CATEGORY_CONFIG[category]?.color || '#3A3A4A';
  };

  if (!flowViewModalOpen) return null;

  const flow = selectedFlow;

  return (
    <div
      className="modal-backdrop flex items-end md:items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="modal-content animate-modal-enter max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A3A]">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <GitBranch className="w-5 h-5 text-[#8B5CF6] flex-shrink-0" />
            <h2 className="text-lg font-semibold text-white truncate">
              {flow?.name || 'Cargando...'}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {flow && (
              <button
                onClick={handleEdit}
                className="p-2 rounded-lg text-[#71717A] hover:text-white hover:bg-[#1A1A24] transition-colors"
                aria-label="Editar flujo"
              >
                <Pencil className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={closeFlowViewModal}
              className="p-2 rounded-lg text-[#71717A] hover:text-white hover:bg-[#1A1A24] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto p-4"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
            </div>
          ) : !flow ? (
            <div className="text-center py-12 text-[#71717A]">
              No se encontró el flujo
            </div>
          ) : (
            <>
              {/* Description */}
              {flow.description && (
                <p className="text-sm text-[#A1A1AA] mb-4">{flow.description}</p>
              )}

              {/* Node count */}
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs text-[#52525B] uppercase tracking-wider">
                  {flow.nodes.length} prompt{flow.nodes.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Nodes */}
              {flow.nodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#1A1A24] flex items-center justify-center mb-4">
                    <GitBranch className="w-8 h-8 text-[#3A3A4A]" />
                  </div>
                  <p className="text-[#A1A1AA] mb-1">Este flujo está vacío</p>
                  <p className="text-sm text-[#71717A] mb-6">
                    Agrega prompts para construir tu flujo
                  </p>
                  <button
                    onClick={handleEdit}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    Agregar prompts
                  </button>
                </div>
              ) : (
                <div className="space-y-0">
                  {flow.nodes.map((node, index) => {
                    const prompt = node.prompt;
                    const category = prompt?.category as Category | null;
                    const connectorColor = getCategoryColor(category);
                    const isLast = index === flow.nodes.length - 1;

                    return (
                      <div key={node.id} className="flex flex-col items-center">
                        {/* Node card */}
                        <button
                          onClick={() => handleNodeTap(node.promptId)}
                          className="flow-node-card w-full flex items-center gap-3 text-left group"
                        >
                          {/* Position badge */}
                          <div className="flow-position-badge">
                            {index + 1}
                          </div>

                          {/* Prompt thumbnail */}
                          {prompt?.thumbnailUrl ? (
                            <img
                              src={prompt.thumbnailUrl}
                              alt=""
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-[#1A1A24] flex items-center justify-center flex-shrink-0">
                              <ImageIcon className="w-6 h-6 text-[#3A3A4A]" />
                            </div>
                          )}

                          {/* Prompt info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {prompt?.title || 'Sin título'}
                            </p>
                            <p className="text-xs text-[#A1A1AA] truncate mt-0.5">
                              {prompt?.content?.slice(0, 80) || 'Cargando...'}
                            </p>
                            {category && (
                              <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r ${CATEGORY_CONFIG[category].gradient} text-white`}>
                                {CATEGORY_CONFIG[category].label}
                              </span>
                            )}
                          </div>

                          <ChevronRight className="w-5 h-5 text-[#3A3A4A] group-hover:text-[#8B5CF6] transition-colors flex-shrink-0" />
                        </button>

                        {/* Connector line */}
                        {!isLast && (
                          <div className="flex items-center gap-2 py-1">
                            <div
                              className="flow-connector"
                              style={{ backgroundColor: connectorColor }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer info */}
              {flow && (
                <div className="pt-6 mt-6 border-t border-[#2A2A3A] text-xs text-[#71717A]">
                  <p>Creado: {new Date(flow.createdAt).toLocaleString('es-ES')}</p>
                  <p>Actualizado: {new Date(flow.updatedAt).toLocaleString('es-ES')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
