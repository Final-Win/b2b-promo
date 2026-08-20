import { create } from 'zustand';

type PanelMode = 'create' | 'edit';

interface WbsPanelState {
  isOpen: boolean;
  wbsId: string | null;
  mode: PanelMode;
  openCreate: () => void;
  openEdit: (wbsId: string) => void;
  close: () => void;
}

export const useWbsPanelStore = create<WbsPanelState>((set) => ({
  isOpen: false,
  wbsId: null,
  mode: 'create',
  openCreate: () => set({ isOpen: true, wbsId: null, mode: 'create' }),
  openEdit: (wbsId) => set({ isOpen: true, wbsId, mode: 'edit' }),
  close: () => set({ isOpen: false, wbsId: null }),
}));
