import { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Heart,
  Copy,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  GitBranch,
  History,
  RotateCcw,
} from 'lucide-react';
import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';
import {
  CATEGORY_CONFIG,
  INTENT_CONFIG,
  TARGET_CONFIG,
  INPUT_MODE_CONFIG,
  PRESERVATION_CONFIG,
  VERSION_CHANGE_REASON_CONFIG,
} from '@/types';
import type { Flow, PromptVersionDetail, VersionSummary } from '@/types';
import * as api from '@/services/api';

const SWIPE_THRESHOLD = 50;

export function DetailModal() {
  const {
    selectedPrompt,
    fetchPromptById,
    toggleFavorite,
    deletePrompt,
    restorePromptVersion,
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
  const [promptFlows, setPromptFlows] = useState<Flow[]>([]);
  const { openFlowViewModal } = useUIStore();

  // Version history (local UI state — only needed inside detail UX)
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null);
  const [versionDetail, setVersionDetail] = useState<PromptVersionDetail | null>(null);
  const [versionDetailLoading, setVersionDetailLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const loadVersions = useCallback(async (promptId: string) => {
    setVersionsLoading(true);
    setVersionsError(null);
    try {
      const list = await api.listPromptVersions(promptId);
      setVersions(list);
    } catch (error) {
      setVersions([]);
      setVersionsError(
        error instanceof Error ? error.message : 'Error cargando historial'
      );
    } finally {
      setVersionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (detailModalOpen && selectedPromptId) {
      fetchPromptById(selectedPromptId);
      api.getFlows(selectedPromptId).then(setPromptFlows).catch(() => setPromptFlows([]));
      // Reset history selection when switching prompts; load list for timeline
      setHistoryOpen(false);
      setSelectedVersionNumber(null);
      setVersionDetail(null);
      setVersionsError(null);
      void loadVersions(selectedPromptId);
    } else {
      setPromptFlows([]);
      setVersions([]);
      setSelectedVersionNumber(null);
      setVersionDetail(null);
      setHistoryOpen(false);
      setVersionsError(null);
    }
  }, [detailModalOpen, selectedPromptId, fetchPromptById, loadVersions]);

  const handleSelectVersion = async (version: number) => {
    if (!selectedPromptId) return;
    if (selectedVersionNumber === version) {
      // Toggle off preview
      setSelectedVersionNumber(null);
      setVersionDetail(null);
      return;
    }

    setSelectedVersionNumber(version);
    setVersionDetailLoading(true);
    try {
      const detail = await api.getPromptVersion(selectedPromptId, version);
      setVersionDetail(detail);
    } catch (error) {
      setVersionDetail(null);
      showError(
        error instanceof Error ? error.message : 'Error cargando versión'
      );
    } finally {
      setVersionDetailLoading(false);
    }
  };

  const handleRestoreVersion = async () => {
    if (!selectedPromptId || selectedVersionNumber == null) return;

    if (
      !confirm(
        `¿Restaurar la versión ${selectedVersionNumber}? El contenido actual se reemplazará y se creará una nueva entrada en el historial.`
      )
    ) {
      return;
    }

    setRestoring(true);
    const toastId = showLoading('Restaurando versión...');
    try {
      // Store action updates selectedPrompt/prompts without isLoading /
      // analysis spinner — restore never re-queues AI.
      await restorePromptVersion(selectedPromptId, selectedVersionNumber);
      removeToast(toastId);
      showSuccess('Versión restaurada exitosamente');
      setSelectedVersionNumber(null);
      setVersionDetail(null);
      await loadVersions(selectedPromptId);
    } catch (error) {
      removeToast(toastId);
      showError(
        error instanceof Error ? error.message : 'Error restaurando versión'
      );
    } finally {
      setRestoring(false);
    }
  };

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
  const intentConfig = prompt?.intent ? INTENT_CONFIG[prompt.intent] : null;

  const formatSubcategory = (slug: string) =>
    slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const hasIntentMetadata =
    prompt &&
    (prompt.intent ||
      prompt.targets.length > 0 ||
      prompt.inputMode ||
      prompt.preservation ||
      prompt.subcategory);

  const previewCategoryConfig = versionDetail?.category
    ? CATEGORY_CONFIG[versionDetail.category]
    : null;
  const previewIntentConfig = versionDetail?.intent
    ? INTENT_CONFIG[versionDetail.intent]
    : null;

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
        className="modal-content animate-modal-enter max-w-2xl select-none flex flex-col max-h-[90vh]"
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
          className="p-4 space-y-6 flex-1 overflow-y-auto min-h-0 animate-content-fade"
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
                <h3 className="text-sm font-medium text-[#71717A] uppercase tracking-wider">
                  Prompt
                </h3>
                <div className="p-4 bg-[#1A1A24] rounded-xl">
                  <p className="text-white font-mono whitespace-pre-wrap">
                    {prompt.content}
                  </p>
                </div>
              </div>

              {/* Intent Categorization */}
              {hasIntentMetadata && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[#71717A] uppercase tracking-wider">
                    Categorización de imagen
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {intentConfig && (
                      <div className="p-3 bg-[#1A1A24] rounded-lg">
                        <p className="text-xs text-[#71717A]">Intención</p>
                        <p className="text-sm text-white">{intentConfig.label}</p>
                      </div>
                    )}
                    {prompt.targets.length > 0 && (
                      <div className="p-3 bg-[#1A1A24] rounded-lg">
                        <p className="text-xs text-[#71717A]">Objetivos</p>
                        <p className="text-sm text-white">
                          {prompt.targets.map((t) => TARGET_CONFIG[t].label).join(', ')}
                        </p>
                      </div>
                    )}
                    {prompt.inputMode && (
                      <div className="p-3 bg-[#1A1A24] rounded-lg">
                        <p className="text-xs text-[#71717A]">Modo de entrada</p>
                        <p className="text-sm text-white">{INPUT_MODE_CONFIG[prompt.inputMode].label}</p>
                      </div>
                    )}
                    {prompt.preservation && (
                      <div className="p-3 bg-[#1A1A24] rounded-lg">
                        <p className="text-xs text-[#71717A]">Preservación</p>
                        <p className="text-sm text-white">{PRESERVATION_CONFIG[prompt.preservation].label}</p>
                      </div>
                    )}
                    {prompt.subcategory && (
                      <div className="p-3 bg-[#1A1A24] rounded-lg">
                        <p className="text-xs text-[#71717A]">Subcategoría</p>
                        <p className="text-sm text-white">{formatSubcategory(prompt.subcategory)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

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

              {/* Flows this prompt belongs to */}
              {promptFlows.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[#71717A] uppercase tracking-wider">
                    Flujos
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {promptFlows.map(flow => (
                      <button
                        key={flow.id}
                        onClick={() => {
                          closeDetailModal();
                          setTimeout(() => openFlowViewModal(flow.id), 150);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg
                                   bg-[#1A1A24] border border-[#2A2A3A]
                                   text-[#A1A1AA] hover:text-white hover:border-[#8B5CF6]
                                   transition-all text-sm"
                      >
                        <GitBranch className="w-4 h-4 text-[#8B5CF6]" />
                        <span>{flow.name}</span>
                        <span className="text-xs text-[#52525B] tabular-nums">
                          {flow._count?.nodes ?? '?'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Version History */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setHistoryOpen((open) => !open)}
                  className="w-full flex items-center justify-between gap-2
                             text-sm font-medium text-[#71717A] uppercase tracking-wider
                             hover:text-white transition-colors"
                  aria-expanded={historyOpen}
                >
                  <span className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Historial
                    {!versionsLoading && versions.length > 0 && (
                      <span className="normal-case tracking-normal text-xs text-[#52525B] tabular-nums">
                        ({versions.length})
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {historyOpen && (
                  <div className="space-y-3 rounded-xl border border-[#2A2A3A] bg-[#12121A] p-3">
                    {versionsLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
                      </div>
                    ) : versionsError ? (
                      <p className="text-sm text-[#EF4444] text-center py-4">
                        {versionsError}
                      </p>
                    ) : versions.length === 0 ? (
                      <div className="text-center py-6 space-y-1">
                        <p className="text-sm text-[#A1A1AA]">Sin historial aún</p>
                        <p className="text-xs text-[#52525B]">
                          Las versiones aparecerán cuando se edite este prompt
                        </p>
                      </div>
                    ) : (
                      <>
                        <ul className="space-y-2">
                          {versions.map((entry) => {
                            const isSelected = selectedVersionNumber === entry.version;
                            const reasonLabel =
                              VERSION_CHANGE_REASON_CONFIG[entry.changeReason]?.label ??
                              entry.changeReason;
                            return (
                              <li key={entry.version}>
                                <button
                                  type="button"
                                  onClick={() => void handleSelectVersion(entry.version)}
                                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                                    isSelected
                                      ? 'border-[#8B5CF6] bg-[#8B5CF6]/10'
                                      : 'border-[#2A2A3A] bg-[#1A1A24] hover:border-[#3A3A4A]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-white">
                                      v{entry.version}
                                      {entry.title ? (
                                        <span className="ml-2 font-normal text-[#A1A1AA]">
                                          {entry.title}
                                        </span>
                                      ) : null}
                                    </span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#2A2A3A] text-[#A1A1AA]">
                                      {reasonLabel}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-[#52525B]">
                                    {new Date(entry.createdAt).toLocaleString('es-ES')}
                                  </p>
                                </button>
                              </li>
                            );
                          })}
                        </ul>

                        {/* Read-only version preview */}
                        {selectedVersionNumber != null && (
                          <div className="mt-2 space-y-3 border-t border-[#2A2A3A] pt-3">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-xs font-medium text-[#71717A] uppercase tracking-wider">
                                Vista previa · v{selectedVersionNumber}
                              </h4>
                              <button
                                type="button"
                                onClick={() => void handleRestoreVersion()}
                                disabled={restoring || versionDetailLoading || !versionDetail}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                           bg-[#8B5CF6]/15 text-[#C4B5FD] border border-[#8B5CF6]/40
                                           hover:bg-[#8B5CF6]/25 disabled:opacity-50 disabled:cursor-not-allowed
                                           transition-colors"
                              >
                                {restoring ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-3.5 h-3.5" />
                                )}
                                Restaurar
                              </button>
                            </div>

                            {versionDetailLoading ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
                              </div>
                            ) : versionDetail ? (
                              <div className="space-y-3">
                                {versionDetail.imageUrl ? (
                                  <div className="rounded-lg overflow-hidden">
                                    <img
                                      src={versionDetail.imageUrl}
                                      alt={versionDetail.title || `Versión ${versionDetail.version}`}
                                      className="w-full max-h-48 object-cover"
                                      draggable={false}
                                    />
                                  </div>
                                ) : (
                                  <div className="aspect-video max-h-32 rounded-lg bg-[#1A1A24] flex items-center justify-center">
                                    <ImageIcon className="w-10 h-10 text-[#3A3A4A]" />
                                  </div>
                                )}

                                <div>
                                  {previewCategoryConfig && (
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${previewCategoryConfig.gradient} text-white mb-2`}
                                    >
                                      {previewCategoryConfig.label}
                                    </span>
                                  )}
                                  <p className="text-sm font-medium text-white">
                                    {versionDetail.title || 'Sin título'}
                                  </p>
                                  {versionDetail.description && (
                                    <p className="mt-1 text-xs text-[#A1A1AA]">
                                      {versionDetail.description}
                                    </p>
                                  )}
                                </div>

                                <div className="p-3 bg-[#1A1A24] rounded-lg">
                                  <p className="text-xs text-white font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                                    {versionDetail.content}
                                  </p>
                                </div>

                                {(previewIntentConfig ||
                                  versionDetail.targets?.length > 0 ||
                                  versionDetail.inputMode ||
                                  versionDetail.preservation ||
                                  versionDetail.subcategory) && (
                                  <div className="grid grid-cols-2 gap-2">
                                    {previewIntentConfig && (
                                      <div className="p-2 bg-[#1A1A24] rounded-lg">
                                        <p className="text-[10px] text-[#71717A]">Intención</p>
                                        <p className="text-xs text-white">{previewIntentConfig.label}</p>
                                      </div>
                                    )}
                                    {versionDetail.targets?.length > 0 && (
                                      <div className="p-2 bg-[#1A1A24] rounded-lg">
                                        <p className="text-[10px] text-[#71717A]">Objetivos</p>
                                        <p className="text-xs text-white">
                                          {versionDetail.targets
                                            .map((t) => TARGET_CONFIG[t]?.label ?? t)
                                            .join(', ')}
                                        </p>
                                      </div>
                                    )}
                                    {versionDetail.inputMode && (
                                      <div className="p-2 bg-[#1A1A24] rounded-lg">
                                        <p className="text-[10px] text-[#71717A]">Modo de entrada</p>
                                        <p className="text-xs text-white">
                                          {INPUT_MODE_CONFIG[versionDetail.inputMode]?.label ??
                                            versionDetail.inputMode}
                                        </p>
                                      </div>
                                    )}
                                    {versionDetail.preservation && (
                                      <div className="p-2 bg-[#1A1A24] rounded-lg">
                                        <p className="text-[10px] text-[#71717A]">Preservación</p>
                                        <p className="text-xs text-white">
                                          {PRESERVATION_CONFIG[versionDetail.preservation]?.label ??
                                            versionDetail.preservation}
                                        </p>
                                      </div>
                                    )}
                                    {versionDetail.subcategory && (
                                      <div className="p-2 bg-[#1A1A24] rounded-lg">
                                        <p className="text-[10px] text-[#71717A]">Subcategoría</p>
                                        <p className="text-xs text-white">
                                          {formatSubcategory(versionDetail.subcategory)}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {versionDetail.metadata &&
                                  Object.keys(versionDetail.metadata).length > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                      {Object.entries(versionDetail.metadata).map(
                                        ([key, value]) =>
                                          value ? (
                                            <div key={key} className="p-2 bg-[#1A1A24] rounded-lg">
                                              <p className="text-[10px] text-[#71717A] capitalize">
                                                {key}
                                              </p>
                                              <p className="text-xs text-white capitalize">
                                                {String(value)}
                                              </p>
                                            </div>
                                          ) : null
                                      )}
                                    </div>
                                  )}

                                {versionDetail.tags?.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {versionDetail.tags.map((tagName) => (
                                      <span key={tagName} className="tag-pill text-xs">
                                        #{tagName}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-[#71717A] text-center py-4">
                                No se pudo cargar la versión
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

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

        {/* Fixed Bottom Copy Bar */}
        {prompt && (
          <div className="shrink-0 p-4 border-t border-[#2A2A3A]">
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl
                       bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4]
                       text-white font-medium hover:opacity-90 transition-opacity"
            >
              <Copy className="w-4 h-4" />
              Copiar prompt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
