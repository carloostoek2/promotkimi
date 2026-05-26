import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Heart, Copy, Pencil, Trash2, Image as ImageIcon, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';
import { CATEGORY_CONFIG } from '@/types';

const SWIPE_THRESHOLD = 50;

export function DetailModal() {
  const {
    selectedPrompt,
    fetchPromptById,
    toggleFavorite,
    deletePrompt,
    isLoading
  } = usePromptStore();
  const {
    detailModalOpen,
    closeDetailModal,
    selectedPromptId,
    setSelectedPromptId,
    openEditModal,
    showSuccess,
    showError,
    showLoading,
    removeToast
  } = useUIStore();

  const prompts = usePromptStore(state => state.prompts);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [swipeDelta, setSwipeDelta] = useState(0);

  useEffect(() => {
    if (detailModalOpen && selectedPromptId) {
      fetchPromptById(selectedPromptId);
    }
  }, [detailModalOpen, selectedPromptId, fetchPromptById]);

  const currentIndex = prompts.findIndex(p => p.id === selectedPromptId);
  const prevPromptId = currentIndex > 0 ? prompts[currentIndex - 1].id : null;
  const nextPromptId = currentIndex < prompts.length - 1 ? prompts[currentIndex + 1].id : null;

  const navigateTo = useCallback((promptId: string) => {
    setSelectedPromptId(promptId);
  }, [setSelectedPromptId]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const deltaX = e.touches[0].clientX - touchStart.current.x;
    const deltaY = e.touches[0].clientY - touchStart.current.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeDelta(deltaX);
    } else {
      setSwipeDelta(0);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    setSwipeDelta(0);

    if (!start) return;

    const deltaX = e.changedTouches[0].clientX - start.x;
    const deltaY = e.changedTouches[0].clientY - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > absY && absX > SWIPE_THRESHOLD) {
      if (deltaX < 0 && nextPromptId) {
        navigateTo(nextPromptId);
      } else if (deltaX > 0 && prevPromptId) {
        navigateTo(prevPromptId);
      }
      return;
    }

    if (absY > absX && absY > 80) {
      const contentEl = contentRef.current;
      if (contentEl) {
        const atTop = contentEl.scrollTop <= 0;
        const atBottom = contentEl.scrollTop + contentEl.clientHeight >= contentEl.scrollHeight - 1;

        if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
          closeDetailModal();
        }
      } else {
        closeDetailModal();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && prevPromptId) {
      e.preventDefault();
      navigateTo(prevPromptId);
    } else if (e.key === 'ArrowRight' && nextPromptId) {
      e.preventDefault();
      navigateTo(nextPromptId);
    } else if (e.key === 'Escape') {
      closeDetailModal();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeDetailModal();
    }
  };

  const handleCopy = () => {
    if (selectedPrompt) {
      navigator.clipboard.writeText(selectedPrompt.content);
      showSuccess('Prompt copiado al portapapeles');
    }
  };

  const handleFavorite = () => {
    if (selectedPrompt) {
      toggleFavorite(selectedPrompt.id);
    }
  };

  const handleEdit = () => {
    if (selectedPrompt) {
      closeDetailModal();
      openEditModal(selectedPrompt.id);
    }
  };

  const handleDelete = async () => {
    if (!selectedPrompt) return;

    if (!confirm('¿Estás seguro de que quieres eliminar este prompt?')) {
      return;
    }

    const toastId = showLoading('Eliminando prompt...');

    try {
      await deletePrompt(selectedPrompt.id);
      removeToast(toastId);
      showSuccess('Prompt eliminado exitosamente');
      closeDetailModal();
    } catch (error) {
      removeToast(toastId);
      showError('Error eliminando prompt');
    }
  };

  if (!detailModalOpen) return null;

  const prompt = selectedPrompt;
  const categoryConfig = prompt?.category ? CATEGORY_CONFIG[prompt.category] : null;

  return (
    <div
      className="modal-backdrop flex items-end md:items-center justify-center"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      {/* Prev / Next arrow buttons (desktop) */}
      {prevPromptId && (
        <button
          onClick={(e) => { e.stopPropagation(); navigateTo(prevPromptId); }}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10
                     w-11 h-11 rounded-full bg-[#12121A]/90 border border-[#2A2A3A]
                     items-center justify-center text-[#A1A1AA] hover:text-white
                     hover:border-[#8B5CF6] hover:bg-[#1A1A24] transition-all
                     backdrop-blur-sm shadow-lg"
          aria-label="Prompt anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {nextPromptId && (
        <button
          onClick={(e) => { e.stopPropagation(); navigateTo(nextPromptId); }}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10
                     w-11 h-11 rounded-full bg-[#12121A]/90 border border-[#2A2A3A]
                     items-center justify-center text-[#A1A1AA] hover:text-white
                     hover:border-[#8B5CF6] hover:bg-[#1A1A24] transition-all
                     backdrop-blur-sm shadow-lg"
          aria-label="Siguiente prompt"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      <div
        className="modal-content animate-modal-enter max-w-2xl select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: swipeDelta ? `translateX(${swipeDelta * 0.4}px)` : undefined,
          transition: swipeDelta ? 'none' : 'transform 250ms ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A3A]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleFavorite}
              className={`p-2 rounded-lg transition-colors ${
                prompt?.isFavorite
                  ? 'text-[#8B5CF6] bg-[#8B5CF6]/10'
                  : 'text-[#71717A] hover:text-white hover:bg-[#1A1A24]'
              }`}
            >
              <Heart
                className="w-5 h-5"
                fill={prompt?.isFavorite ? 'currentColor' : 'none'}
              />
            </button>
            <button
              onClick={handleEdit}
              className="p-2 rounded-lg text-[#71717A] hover:text-white hover:bg-[#1A1A24] transition-colors"
            >
              <Pencil className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg text-[#71717A] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* Nav counter */}
          {prompts.length > 1 && (
            <span className="text-xs text-[#52525B] tabular-nums">
              {currentIndex + 1} / {prompts.length}
            </span>
          )}

          <button
            onClick={closeDetailModal}
            className="p-2 rounded-lg text-[#71717A] hover:text-white hover:bg-[#1A1A24] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="p-4 space-y-6 max-h-[70vh] overflow-y-auto animate-content-fade"
          key={selectedPromptId}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
            </div>
          ) : prompt ? (
            <>
              {/* Image */}
              {prompt.imageUrl ? (
                <div className="rounded-xl overflow-hidden">
                  <img
                    src={prompt.imageUrl}
                    alt={prompt.title || 'Prompt'}
                    className="w-full max-h-80 object-cover"
                    draggable={false}
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-xl bg-[#1A1A24] flex items-center justify-center">
                  <ImageIcon className="w-16 h-16 text-[#3A3A4A]" />
                </div>
              )}

              {/* Title & Category */}
              <div>
                {categoryConfig && (
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${categoryConfig.gradient} text-white mb-3`}>
                    {categoryConfig.label}
                  </span>
                )}
                <h2 className="text-xl font-semibold text-white">
                  {prompt.title || 'Sin título'}
                </h2>
                {prompt.description && (
                  <p className="mt-2 text-[#A1A1AA]">{prompt.description}</p>
                )}
              </div>

              {/* Prompt Content */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[#71717A] uppercase tracking-wider">
                    Prompt
                  </h3>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                             text-[#A1A1AA] hover:text-white hover:bg-[#1A1A24] transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar
                  </button>
                </div>
                <div className="p-4 bg-[#1A1A24] rounded-xl">
                  <p className="text-white font-mono whitespace-pre-wrap">
                    {prompt.content}
                  </p>
                </div>
              </div>

              {/* Metadata */}
              {prompt.metadata && Object.keys(prompt.metadata).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[#71717A] uppercase tracking-wider">
                    Metadata
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(prompt.metadata).map(([key, value]) => (
                      value && (
                        <div key={key} className="p-3 bg-[#1A1A24] rounded-lg">
                          <p className="text-xs text-[#71717A] capitalize">{key}</p>
                          <p className="text-sm text-white capitalize">{String(value)}</p>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {prompt.tags.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[#71717A] uppercase tracking-wider">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {prompt.tags.map(({ tag }) => (
                      <span key={tag.id} className="tag-pill">
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Info */}
              <div className="pt-4 border-t border-[#2A2A3A] text-xs text-[#71717A]">
                <p>Creado: {new Date(prompt.createdAt).toLocaleString('es-ES')}</p>
                <p>Actualizado: {new Date(prompt.updatedAt).toLocaleString('es-ES')}</p>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-[#71717A]">
              No se encontró el prompt
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
