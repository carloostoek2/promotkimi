import { useEffect } from 'react';
import { X, Heart, Copy, Pencil, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';
import { CATEGORY_CONFIG } from '@/types';

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
    openEditModal,
    showSuccess,
    showError,
    showLoading,
    removeToast
  } = useUIStore();

  useEffect(() => {
    if (detailModalOpen && selectedPromptId) {
      fetchPromptById(selectedPromptId);
    }
  }, [detailModalOpen, selectedPromptId, fetchPromptById]);

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
    >
      <div className="modal-content animate-modal-enter max-w-2xl">
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
          <button
            onClick={closeDetailModal}
            className="p-2 rounded-lg text-[#71717A] hover:text-white hover:bg-[#1A1A24] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
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
