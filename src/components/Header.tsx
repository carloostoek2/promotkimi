import { useState, useEffect } from 'react';
import { Search, Plus, SlidersHorizontal, X, LayoutGrid, LayoutList } from 'lucide-react';
import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';
import type { Category } from '@/types';

const CATEGORIES: { value: Category | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'IMAGEN', label: 'Imagen' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'TEXTO', label: 'Texto' },
  { value: 'AUDIO', label: 'Audio' },
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

  const hasActiveFilters = filters.category || filters.isFavorite || (filters.tags && filters.tags.length > 0);

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
          <div className="mt-4 p-4 bg-[#12121A] border border-[#2A2A3A] rounded-xl animate-fade-in">
            <div className="flex flex-wrap items-center gap-4">
              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#71717A]">Categoría:</span>
                <div className="flex gap-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => {
                        setFilters({ category: cat.value as Category || undefined });
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
                  onClick={() => {
                    setFilters({ category: undefined, isFavorite: undefined, tags: undefined });
                    fetchPrompts();
                  }}
                  className="text-sm text-[#71717A] hover:text-white transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
