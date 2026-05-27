import { useEffect } from 'react';
import { Header } from '@/components/Header';
import { PromptGrid } from '@/components/prompts/PromptGrid';
import { CreateModal } from '@/components/prompts/CreateModal';
import { DetailModal } from '@/components/prompts/DetailModal';
import { FlowListModal } from '@/components/flows/FlowListModal';
import { FlowViewModal } from '@/components/flows/FlowViewModal';
import { FlowFormModal } from '@/components/flows/FlowFormModal';
import { ToastContainer } from '@/components/ToastContainer';
import { FAB } from '@/components/FAB';
import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';

function App() {
  const { prompts, isLoading, fetchPrompts } = usePromptStore();
  const { showError } = useUIStore();

  // Initial fetch
  useEffect(() => {
    fetchPrompts().catch(() => {
      showError('Error conectando con el servidor');
    });
  }, [fetchPrompts, showError]);

  // Poll for updates every 5 seconds (silent - no loading skeleton)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPrompts(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchPrompts]);

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {/* Stats */}
        <div className="mb-6 flex items-center gap-4 text-sm text-[#71717A]">
          <span>{prompts.length} prompts</span>
          {prompts.filter(p => p.analysisStatus === 'PROCESSING').length > 0 && (
            <span className="flex items-center gap-1.5 text-[#8B5CF6]">
              <span className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-pulse" />
              {prompts.filter(p => p.analysisStatus === 'PROCESSING').length} analizando
            </span>
          )}
        </div>

        {/* Grid */}
        <PromptGrid prompts={prompts} isLoading={isLoading} />
      </main>

      {/* Floating Action Button (Mobile) */}
      <FAB />

      {/* Modals */}
      <CreateModal />
      <DetailModal />
      <FlowListModal />
      <FlowViewModal />
      <FlowFormModal />

      {/* Toasts */}
      <ToastContainer />
    </div>
  );
}

export default App;
