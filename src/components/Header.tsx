import { useState, useEffect } from 'react';
import { Search, Plus, SlidersHorizontal, X, LayoutGrid, LayoutList } from 'lucide-react';
import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';
import type { Category, ImageIntent, ImageTarget, InputMode, Preservation } from '@/types';
import {
  INTENT_CONFIG,
  TARGET_CONFIG,
  INPUT_MODE_CONFIG,
  PRESERVATION_CONFIG,
} from '@/types';

const CATEGORIES: { value: Category | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'IMAGEN', label: 'Imagen' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'TEXTO', label: 'Texto' },
  { value: 'AUDIO', label: 'Audio' },
];

const INTENTS: { value: ImageIntent | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  ...(Object.entries(INTENT_CONFIG) as [ImageIntent, { label: string }][]).map(
    ([value, config]) => ({ value, label: config.label })
  ),
];

const TARGETS: { value: ImageTarget; label: string }[] = (
  Object.entries(TARGET_CONFIG) as [ImageTarget, { label: string }][]
).map(([value, config]) => ({ value, label: config.label }));

const INPUT_MODES: { value: InputMode | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  ...(Object.entries(INPUT_MODE_CONFIG) as [InputMode, { label: string }][]).map(
    ([value, config]) => ({ value, label: config.label })
  ),
];

const PRESERVATIONS: { value: Preservation | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  ...(Object.entries(PRESERVATION_CONFIG) as [Preservation, { label: string }][]).map(
    ([value, config]) => ({ value, label: config.label })
  ),
];

export function Header() {
  const { filters, setFilters, fetchPrompts } = usePromptStore();
  const { openCreateModal, toggleFilterPanel, filterPanelOpen, viewMode, setViewMode } = useUIStore();
  const [searchValue, setSearchValue] = useState(filters.search || '');

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters({ search: searchValue });
      fetchPrompts();
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchValue, setFilters, fetchPrompts]);

  const handleClearSearch = () => {
    setSearchValue('');
    setFilters({ search: '' });
    fetchPrompts();
  };

  const showImageFilters = !filters.category || filters.category === 'IMAGEN';

  const hasActiveFilters =
    filters.category ||
    filters.isFavorite ||
    (filters.tags && filters.tags.length > 0) ||
    filters.intent ||
    filters.target ||
    filters.inputMode ||
    filters.preservation;

  const clearAllFilters = () => {
    setFilters({
      category: undefined,
      isFavorite: undefined,
      tags: undefined,
      intent: undefined,
      target: undefined,
      inputMode: undefined,
      preservation: undefined,
    });
    fetchPrompts();
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0A0A0F]/80 backdrop-blur-lg border-b border-[#2A2A3A]">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="hidden sm:block font-semibold text-white">PromptVault</span>
          </div>

          {/* Search Bar */}
          <div className="flex-1 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#71717A]" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Buscar prompts..."
                className="w-full pl-10 pr-10 py-2.5 bg-[#12121A] border border-[#2A2A3A] rounded-xl
                         text-white placeholder:text-[#71717A]
                         focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20
                         transition-all duration-150"
              />
              {searchValue && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#12121A] border border-[#2A2A3A] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#71717A] hover:text-white'
              }`}
              title="Vista lista"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('mosaic')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'mosaic'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#71717A] hover:text-white'
              }`}
              title="Vista mosaico"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Button */}
          <button
            onClick={toggleFilterPanel}
            className={`p-2.5 rounded-xl border transition-colors relative ${
              hasActiveFilters
                ? 'border-[#8B5CF6] text-[#8B5CF6] bg-[#8B5CF6]/10'
                : 'border-[#2A2A3A] text-[#71717A] hover:text-white hover:border-[#3A3A4A]'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#8B5CF6] rounded-full" />
            )}
          </button>

          {/* New Button (Desktop) */}
          <button
            onClick={openCreateModal}
            className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl
                     bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4]
                     text-white font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo</span>
          </button>
        </div>

        {/* Filter Panel */}
        {filterPanelOpen && (
          <div className="mt-4 p-4 bg-[#12121A] border border-[#2A2A3A] rounded-xl animate-fade-in space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#71717A]">Categoría:</span>
                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => {
                        const category = cat.value ? (cat.value as Category) : undefined;
                        setFilters({
                          category,
                          ...(category && category !== 'IMAGEN'
                            ? {
                                intent: undefined,
                                target: undefined,
                                inputMode: undefined,
                                preservation: undefined,
                              }
                            : {}),
                        });
                        fetchPrompts();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        filters.category === cat.value || (!filters.category && !cat.value)
                          ? 'bg-[#8B5CF6] text-white'
                          : 'bg-[#1A1A24] text-[#A1A1AA] hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Favorites Filter */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setFilters({ isFavorite: filters.isFavorite ? undefined : true });
                    fetchPrompts();
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    filters.isFavorite
                      ? 'bg-[#8B5CF6] text-white'
                      : 'bg-[#1A1A24] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  <span>★ Favoritos</span>
                </button>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-[#71717A] hover:text-white transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* Image Intent Filters */}
            {showImageFilters && (
              <div className="pt-4 border-t border-[#2A2A3A] space-y-4">
                {/* Intent */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-[#71717A] shrink-0">Intención:</span>
                  <div className="flex flex-wrap gap-1">
                    {INTENTS.map((intent) => (
                      <button
                        key={intent.value || 'all'}
                        onClick={() => {
                          setFilters({ intent: intent.value ? intent.value : undefined });
                          fetchPrompts();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          filters.intent === intent.value || (!filters.intent && !intent.value)
                            ? 'bg-[#8B5CF6] text-white'
                            : 'bg-[#1A1A24] text-[#A1A1AA] hover:text-white'
                        }`}
                      >
                        {intent.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-[#71717A] shrink-0">Objetivo:</span>
                  <div className="flex flex-wrap gap-1">
                    {TARGETS.map((target) => {
                      const isSelected = filters.target === target.value;
                      return (
                        <button
                          key={target.value}
                          onClick={() => {
                            setFilters({ target: isSelected ? undefined : target.value });
                            fetchPrompts();
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            isSelected
                              ? 'bg-[#06B6D4] text-white'
                              : 'bg-[#1A1A24] text-[#A1A1AA] hover:text-white'
                          }`}
                        >
                          {target.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Input Mode */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-[#71717A] shrink-0">Modo de entrada:</span>
                  <div className="flex flex-wrap gap-1">
                    {INPUT_MODES.map((mode) => (
                      <button
                        key={mode.value || 'all'}
                        onClick={() => {
                          setFilters({ inputMode: mode.value ? mode.value : undefined });
                          fetchPrompts();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          filters.inputMode === mode.value || (!filters.inputMode && !mode.value)
                            ? 'bg-[#8B5CF6] text-white'
                            : 'bg-[#1A1A24] text-[#A1A1AA] hover:text-white'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preservation */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-[#71717A] shrink-0">Preservación:</span>
                  <div className="flex flex-wrap gap-1">
                    {PRESERVATIONS.map((preservation) => (
                      <button
                        key={preservation.value || 'all'}
                        onClick={() => {
                          setFilters({
                            preservation: preservation.value ? preservation.value : undefined,
                          });
                          fetchPrompts();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          filters.preservation === preservation.value ||
                          (!filters.preservation && !preservation.value)
                            ? 'bg-[#8B5CF6] text-white'
                            : 'bg-[#1A1A24] text-[#A1A1AA] hover:text-white'
                        }`}
                      >
                        {preservation.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
