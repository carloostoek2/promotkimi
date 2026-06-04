import { Heart, Copy, Image as ImageIcon } from 'lucide-react';
import type { Prompt } from '@/types';
import { CATEGORY_CONFIG } from '@/types';
import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';

interface PromptCardProps {
  prompt: Prompt;
}

export function PromptCard({ prompt }: PromptCardProps) {
  const { toggleFavorite } = usePromptStore();
  const { openDetailModal } = useUIStore();

  const category = prompt.category;
  const categoryConfig = category ? CATEGORY_CONFIG[category] : null;

  // Get first 3 tags
  const displayTags = prompt.tags.slice(0, 3);
  const hasMoreTags = prompt.tags.length > 3;

  // Format date
  const formattedDate = new Date(prompt.createdAt).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(prompt.id);
  };

  const handleCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.content);
  };

  const handleCardClick = () => {
    openDetailModal(prompt.id);
  };

  return (
    <div
      onClick={handleCardClick}
      className="prompt-card cursor-pointer group"
    >
      {/* Image or Placeholder */}
      <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-4 bg-[#1A1A24]">
        {prompt.thumbnailUrl ? (
          <img
            src={prompt.thumbnailUrl}
            alt={prompt.title || 'Prompt'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-[#3A3A4A]" />
          </div>
        )}
        
        {/* Category Badge */}
        {categoryConfig && (
          <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${categoryConfig.gradient} text-white`}>
            {categoryConfig.label}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-white line-clamp-2">
          {prompt.title || 'Sin título'}
        </h3>

        {/* Preview */}
        <p className="text-sm text-[#A1A1AA] line-clamp-3 font-mono">
          {prompt.content}
        </p>

        {/* Tags */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {displayTags.map(({ tag }) => (
              <span key={tag.id} className="tag-pill">
                #{tag.name}
              </span>
            ))}
            {hasMoreTags && (
              <span className="tag-pill">+{prompt.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {/* Favorite Button */}
            <button
              onClick={handleFavoriteClick}
              className={`p-2 rounded-lg transition-colors ${
                prompt.isFavorite
                  ? 'text-[#8B5CF6] bg-[#8B5CF6]/10'
                  : 'text-[#71717A] hover:text-white hover:bg-[#1A1A24]'
              }`}
            >
              <Heart
                className="w-4 h-4"
                fill={prompt.isFavorite ? 'currentColor' : 'none'}
              />
            </button>

            {/* Copy Button */}
            <button
              onClick={handleCopyClick}
              className="p-2 rounded-lg text-[#71717A] hover:text-white hover:bg-[#1A1A24] transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          {/* Date */}
          <span className="text-xs text-[#71717A]">{formattedDate}</span>
        </div>
      </div>
    </div>
  );
}

export function PromptCardMosaic({ prompt }: PromptCardProps) {
  const { toggleFavorite } = usePromptStore();
  const { openDetailModal } = useUIStore();

  const categoryConfig = prompt.category ? CATEGORY_CONFIG[prompt.category] : null;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(prompt.id);
  };

  const handleCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.content);
  };

  return (
    <div
      onClick={() => openDetailModal(prompt.id)}
      className="prompt-card-mosaic cursor-pointer group relative rounded-xl overflow-hidden bg-[#1A1A24]"
    >
      <div className="aspect-square w-full">
        {prompt.thumbnailUrl ? (
          <img
            src={prompt.thumbnailUrl}
            alt={prompt.title || 'Prompt'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#12121A]">
            <ImageIcon className="w-10 h-10 text-[#3A3A4A]" />
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

      {categoryConfig && (
        <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r ${categoryConfig.gradient} text-white`}>
          {categoryConfig.label}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-3">
        <h3 className="font-medium text-white text-sm line-clamp-2 leading-snug">
          {prompt.title || 'Sin título'}
        </h3>
      </div>

      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
        <button
          onClick={handleFavoriteClick}
          className={`p-2 rounded-lg transition-colors ${
            prompt.isFavorite
              ? 'text-[#8B5CF6] bg-[#8B5CF6]/10'
              : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}
        >
          <Heart
            className="w-4 h-4"
            fill={prompt.isFavorite ? 'currentColor' : 'none'}
          />
        </button>
        <button
          onClick={handleCopyClick}
          className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
