import { PromptCard, PromptCardMosaic } from './PromptCard';
import { useUIStore } from '@/stores/uiStore';
import type { Prompt } from '@/types';

interface PromptGridProps {
  prompts: Prompt[];
  isLoading?: boolean;
}

function PromptCardSkeleton() {
  return (
    <div className="bg-[#12121A] border border-[#2A2A3A] rounded-2xl p-4">
      <div className="aspect-[16/10] rounded-xl bg-[#1A1A24] skeleton mb-4" />
      <div className="space-y-3">
        <div className="h-5 bg-[#1A1A24] skeleton rounded w-3/4" />
        <div className="space-y-2">
          <div className="h-4 bg-[#1A1A24] skeleton rounded" />
          <div className="h-4 bg-[#1A1A24] skeleton rounded w-5/6" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-[#1A1A24] skeleton rounded-full" />
          <div className="h-6 w-20 bg-[#1A1A24] skeleton rounded-full" />
        </div>
        <div className="flex justify-between pt-2">
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-[#1A1A24] skeleton rounded-lg" />
            <div className="h-8 w-8 bg-[#1A1A24] skeleton rounded-lg" />
          </div>
          <div className="h-4 w-12 bg-[#1A1A24] skeleton rounded" />
        </div>
      </div>
    </div>
  );
}

function MosaicSkeleton() {
  return (
    <div className="bg-[#1A1A24] rounded-xl overflow-hidden">
      <div className="aspect-square bg-[#12121A] skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-[#2A2A3A] skeleton rounded w-3/4" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-[#1A1A24] flex items-center justify-center mb-4">
        <svg
          className="w-10 h-10 text-[#3A3A4A]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        No tienes prompts aún
      </h3>
      <p className="text-[#A1A1AA] max-w-sm">
        Crea tu primer prompt para empezar a organizar tus ideas
      </p>
    </div>
  );
}

export function PromptGrid({ prompts, isLoading }: PromptGridProps) {
  const { viewMode } = useUIStore();

  if (isLoading) {
    if (viewMode === 'mosaic') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <MosaicSkeleton key={i} />
          ))}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <PromptCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (prompts.length === 0) {
    return <EmptyState />;
  }

  if (viewMode === 'mosaic') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {prompts.map((prompt, index) => (
          <div
            key={prompt.id}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <PromptCardMosaic prompt={prompt} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {prompts.map((prompt, index) => (
        <div
          key={prompt.id}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <PromptCard prompt={prompt} />
        </div>
      ))}
    </div>
  );
}
