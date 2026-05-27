import { useState, useRef, useEffect } from 'react';
import type { Category } from '@/types';
import { X, Image as ImageIcon, Loader2, Save } from 'lucide-react';
import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';
import * as api from '@/services/api';

export function EditModal() {
  const { updatePrompt } = usePromptStore();
  const {
    editModalOpen,
    closeEditModal,
    selectedPromptId,
    showSuccess,
    showError,
    showLoading,
    removeToast
  } = useUIStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editModalOpen && selectedPromptId) {
      const prompt = usePromptStore.getState().prompts.find(p => p.id === selectedPromptId);
      if (prompt) {
        setTitle(prompt.title || '');
        setContent(prompt.content || '');
        setCategory(prompt.category || '');
        setTags(prompt.tags.map(pt => pt.tag.name));
        setCurrentImageUrl(prompt.imageUrl || null);
        setImagePreview(prompt.imageUrl || null);
      }
    }
  }, [editModalOpen, selectedPromptId]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showError('La imagen no debe superar 10MB');
        return;
      }
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(currentImageUrl);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddTag = () => {
    const tag = newTag.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      showError('El contenido del prompt es requerido');
      return;
    }

    if (!selectedPromptId) {
      showError('No se encontró el prompt a editar');
      return;
    }

    setIsSubmitting(true);
    const toastId = showLoading('Guardando prompt...');

    try {
      // Primero actualizar los datos del prompt
      await updatePrompt(selectedPromptId, {
        content: content.trim(),
        title: title.trim() || undefined,
        category: (category as Category) || undefined,
        tags,
      });

      // Si hay una nueva imagen, actualizarla
      if (image) {
        await api.updatePromptImage(selectedPromptId, image);
      }

      removeToast(toastId);
      showSuccess('Prompt actualizado exitosamente');
      handleClose();
    } catch (error) {
      removeToast(toastId);
      showError(error instanceof Error ? error.message : 'Error actualizando prompt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setCategory('');
    setTags([]);
    setNewTag('');
    setImage(null);
    setImagePreview(null);
    setCurrentImageUrl(null);
    closeEditModal();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!editModalOpen) return null;

  return (
    <div
      className="modal-backdrop flex items-end md:items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="modal-content animate-modal-enter max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A3A]">
          <h2 className="text-lg font-semibold text-white">Editar Prompt</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-[#71717A] hover:text-white hover:bg-[#1A1A24] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm text-[#A1A1AA] mb-1.5">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del prompt"
              className="input-dark w-full"
              disabled={isSubmitting}
            />
          </div>

          {/* Prompt Textarea */}
          <div>
            <label className="block text-sm text-[#A1A1AA] mb-1.5">Contenido *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Contenido del prompt..."
              className="textarea-dark min-h-[150px]"
              disabled={isSubmitting}
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-[#71717A]">
                {content.length}/2000
              </span>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm text-[#A1A1AA] mb-1.5">Imagen</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageSelect}
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-40 object-cover"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-[#2A2A3A] rounded-xl
                         text-[#71717A] hover:text-white hover:border-[#3A3A4A]
                         transition-colors flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-5 h-5" />
                <span>Agregar imagen (opcional)</span>
              </button>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm text-[#A1A1AA] mb-1.5">Tags</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full
                           bg-[#8B5CF6]/20 text-[#A78BFA] text-sm"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-white"
                    disabled={isSubmitting}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Agregar tag..."
                className="input-dark flex-1"
                disabled={isSubmitting}
              />
              <button
                onClick={handleAddTag}
                disabled={isSubmitting || !newTag.trim()}
                className="btn-secondary px-3"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2A2A3A]">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}