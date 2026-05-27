import { useRef, useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

const LONG_PRESS_MS = 500;

export function FAB() {
  const { openCreateModal, openFlowListModal } = useUIStore();

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const [isPressing, setIsPressing] = useState(false);

  const clearPressTimer = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    setIsPressing(true);

    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setIsPressing(false);
      openFlowListModal();
    }, LONG_PRESS_MS);
  }, [openFlowListModal]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    clearPressTimer();
    setIsPressing(false);

    if (isLongPress.current) {
      e.preventDefault();
    }
  }, [clearPressTimer]);

  const handleTouchMove = useCallback(() => {
    clearPressTimer();
    setIsPressing(false);
  }, [clearPressTimer]);

  const handleClick = useCallback(() => {
    if (!isLongPress.current) {
      openCreateModal();
    }
  }, [openCreateModal]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    clearPressTimer();
    setIsPressing(false);
    openFlowListModal();
  }, [openFlowListModal, clearPressTimer]);

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onContextMenu={handleContextMenu}
      className={`fab md:hidden ${isPressing ? 'fab-long-press' : ''}`}
      aria-label="Crear nuevo prompt. Mantén presionado para flujos"
      title="Toca para crear prompt. Mantén presionado para flujos"
    >
      <Plus className="w-6 h-6 text-white" />
    </button>
  );
}
