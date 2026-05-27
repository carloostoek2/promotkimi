import { useState, useEffect, useCallback } from 'react';
import { X, Image as ImageIcon, Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';
import { CATEGORY_CONFIG } from '@/types';
import type { Category } from '@/types';
import * as api from '@/services/api';

export function EditModal() {
  const { selectedPrompt, fetchPromptById, updatePrompt } = usePromptStore();
  const {
    editModalOpen,
    closeEditModal,
    selectedPromptId,
    showSuccess,
    showError,
    showLoading,
    removeToast
  } = useUIStore();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [metadataEntries, setMetadataEntries] = useState<{ key: string; value: string }[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [formInitialized, setFormInitialized] = useState(false);

  // Load prompt data when modal opens
  useEffect(() => {
    if (editModalOpen && selectedPromptId) {
      fetchPromptById(selectedPromptId);
    }
  }, [editModalOpen, selectedPromptId, fetchPromptById]);

  // Initialize form when selectedPrompt changes
  useEffect(() => {
    if (selectedPrompt && editModalOpen && !formInitialized) {
      setTitle(selectedPrompt.title || '');
      setDescription(selectedPrompt.description || '');
      setContent(selectedPrompt.content || '');
      setCategory(selectedPrompt.category || '');
      setTags(selectedPrompt.tags.map(t => t.tag.name));
      setCurrentImageUrl(selectedPrompt.imageUrl || null);
      setImage(null);
      setImagePreview(null);
      setMetadataEntries(
        selectedPrompt.metadata
          ? Object.entries(selectedPrompt.metadata).map(([key, value]) => ({
              key,
              value: String(value),
            }))
          : []
      );
      setFormInitialized(true);
    }
  }, [selectedPrompt, editModalOpen, formInitialized]);

  // Reset form when modal closes
  useEffect(() => {
    if (!editModalOpen) {
      setFormInitialized(false);
      setTagInput('');
      setTagSuggestions([]);
    }
  }, [editModalOpen]);

  // Fetch tag suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 1) {
      setTagSuggestions([]);
      return;
    }
    try {
      const suggestions = await api.getTagSuggestions(query);
      setTagSuggestions(suggestions.map(t => t.name).filter(n => !tags.includes(n)));
    } catch {
      setTagSuggestions([]);
    }
  }, [tags]);

  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    fetchSuggestions(value);
  };

  const addTag = (name: string) => {
    const trimmed = name.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
    setTagSuggestions([]);
  };

  const removeTag = (name: string) => {
    setTags(tags.filter(t => t !== name));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  // Metadata handlers
  const addMetadataEntry = () => {
    setMetadataEntries([...metadataEntries, { key: '', value: '' }]);
  };

  const updateMetadataEntry = (index: number, field: 'key' | 'value', val: string) => {
    setMetadataEntries(entries =>
      entries.map((entry, i) => (i === index ? { ...entry, [field]: val } : entry))
    );
  };

  const removeMetadataEntry = (index: number) => {
    setMetadataEntries(entries => entries.filter((_, i) => i !== index));
  };

  // Image handlers
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
    setImagePreview(null);
    setCurrentImageUrl(null);
  };

  // Submit
  const handleSubmit = async () => {
    if (!selectedPrompt) return;
    if (!content.trim()) {
      showError('El contenido del prompt es requerido');
      return;
    }

    setIsSubmitting(true);
    const toastId = showLoading('Actualizando prompt...');

    try {
      const metadata = metadataEntries.reduce(
        (acc, { key, value }) => {
          if (key.trim()) acc[key.trim()] = value;
          return acc;
        },
        {} as Record<string, string>
      );

      await updatePrompt(selectedPrompt.id, {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        content: content.trim(),
        category: category || undefined,
        tags: tags.length > 0 ? tags : undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      if (image) {
        await api.updatePromptImage(selectedPrompt.id, image);
      }

      removeToast(toastId);
      showSuccess('Prompt actualizado exitosamente');
      closeEditModal();
    } catch (error) {
      removeToast(toastId);
      showError(error instanceof Error ? error.message : 'Error actualizando prompt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeEditModal();
    }
  };

  if (!editModalOpen) return null;

  const displayImage = imagePreview || currentImageUrl;

  return (
    <div
      className="modal-backdrop flex items-end md:items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="modal-content animate-modal-enter max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A3A] sticky top-0 bg-[#12121A] z-10">
          <h2 className="text-lg font-semibold text-white">Editar Prompt</h2>
          <button
            onClick={closeEditModal}
            className="p-2 rounded-lg text-[#71717A] hover:text-white hover:bg-[#1A1A24] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del prompt"
              className="input-dark"
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
              Descripción
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción"
              className="input-dark"
              disabled={isSubmitting}
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
              Contenido
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Contenido del prompt..."
              className="textarea-dark min-h-[120px]"
              disabled={isSubmitting}
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-[#71717A]">{content.length}/2000</span>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
              Categoría
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category | '')}
              className="input-dark"
              disabled={isSubmitting}
            >
              <option value="">Sin categoría</option>
              {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]).map(
                ([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="tag-pill flex items-center gap-1 group"
                >
                  #{tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="opacity-60 group-hover:opacity-100 transition-opacity"
                    disabled={isSubmitting}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => handleTagInputChange(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Agregar tag (Enter o coma para añadir)"
                className="input-dark"
                disabled={isSubmitting}
              />
              {tagSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#1A1A24] border border-[#2A2A3A] rounded-lg overflow-hidden z-20">
                  {tagSuggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => addTag(s)}
                      className="w-full text-left px-3 py-2 text-sm text-[#A1A1AA] hover:text-white hover:bg-[#2A2A3A] transition-colors"
                    >
                      #{s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-[#A1A1AA]">
                Metadata
              </label>
              <button
                onClick={addMetadataEntry}
                className="flex items-center gap-1 text-xs text-[#8B5CF6] hover:text-[#A78BFA] transition-colors"
                disabled={isSubmitting}
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar
              </button>
            </div>
            {metadataEntries.length > 0 ? (
              <div className="space-y-2">
                {metadataEntries.map((entry, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={entry.key}
                      onChange={(e) => updateMetadataEntry(index, 'key', e.target.value)}
                      placeholder="Clave"
                      className="input-dark flex-1"
                      disabled={isSubmitting}
                    />
                    <input
                      type="text"
                      value={entry.value}
                      onChange={(e) => updateMetadataEntry(index, 'value', e.target.value)}
                      placeholder="Valor"
                      className="input-dark flex-[2]"
                      disabled={isSubmitting}
                    />
                    <button
                      onClick={() => removeMetadataEntry(index)}
                      className="p-2 rounded-lg text-[#71717A] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                      disabled={isSubmitting}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#52525B]">Sin metadata</p>
            )}
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
              Imagen
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageSelect}
              className="hidden"
              id="edit-image-input"
            />
            {displayImage ? (
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={displayImage}
                  alt="Preview"
                  className="w-full h-40 object-cover"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => document.getElementById('edit-image-input')?.click()}
                className="w-full py-4 border-2 border-dashed border-[#2A2A3A] rounded-xl
                         text-[#71717A] hover:text-white hover:border-[#3A3A4A]
                         transition-colors flex items-center justify-center gap-2"
                disabled={isSubmitting}
              >
                <ImageIcon className="w-5 h-5" />
                <span>Agregar imagen</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2A2A3A] sticky bottom-0 bg-[#12121A]">
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
