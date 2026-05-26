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
