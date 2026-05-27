import { useEffect, useRef, useCallback } from 'react';
import { X, GitBranch, Plus, Loader2, ChevronRight } from 'lucide-react';
import { useFlowStore } from '@/stores/flowStore';
import { useUIStore } from '@/stores/uiStore';

export function FlowListModal() {
  const { flows, isLoading, fetchFlows } = useFlowStore();
  const { flowListModalOpen, closeFlowListModal, openFlowViewModal, openFlowFormModal } = useUIStore();

  const touchStart = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (flowListModalOpen) {
      fetchFlows();
    }
  }, [flowListModalOpen, fetchFlows]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const contentEl = contentRef.current;
    if (!contentEl || touchStart.current === null) return;

    const atTop = contentEl.scrollTop <= 0;
    const deltaY = e.touches[0].clientY - touchStart.current;

    if (atTop && deltaY > 40) {
      closeFlowListModal();
    }
  };

  const handleTouchEnd = () => {
    touchStart.current = null;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeFlowListModal();
    }
  };

  const handleFlowTap = useCallback((flowId: string) => {
    closeFlowListModal();
    setTimeout(() => openFlowViewModal(flowId), 150);
  }, [closeFlowListModal, openFlowViewModal]);

  const handleCreate = useCallback(() => {
    closeFlowListModal();
    setTimeout(() => openFlowFormModal(), 150);
  }, [closeFlowListModal, openFlowFormModal]);

  if (!flowListModalOpen) return null;

  return (
    <div
      className="modal-backdrop flex items-end md:items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div
        className="modal-content animate-modal-enter max-w-md flex flex-col max-h-[85vh]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull handle */}
        <div className="pt-3 md:hidden">
          <div className="sheet-handle" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A3A]">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#8B5CF6]" />
            <h2 className="text-lg font-semibold text-white">Flujos</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                         bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20
                         transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo
            </button>
            <button
              onClick={closeFlowListModal}
              className="p-2 rounded-lg text-[#71717A] hover:text-white hover:bg-[#1A1A24] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
            </div>
          ) : flows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#1A1A24] flex items-center justify-center mb-4">
                <GitBranch className="w-8 h-8 text-[#3A3A4A]" />
              </div>
              <p className="text-[#A1A1AA] mb-1">No tienes flujos aún</p>
              <p className="text-sm text-[#71717A] mb-6">
                Crea tu primer flujo para encadenar prompts
              </p>
              <button
                onClick={handleCreate}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Crear primer flujo
              </button>
            </div>
          ) : (
            flows.map(flow => (
              <button
                key={flow.id}
                onClick={() => handleFlowTap(flow.id)}
                className="flow-card w-full text-left flex items-center justify-between group"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">{flow.name}</h3>
                  {flow.description && (
                    <p className="text-sm text-[#A1A1AA] truncate mt-0.5">
                      {flow.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-[#71717A]">
                      {flow._count?.nodes ?? 0} prompts
                    </span>
                    <span className="text-xs text-[#52525B]">
                      {new Date(flow.createdAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#3A3A4A] group-hover:text-[#8B5CF6] transition-colors flex-shrink-0 ml-3" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
