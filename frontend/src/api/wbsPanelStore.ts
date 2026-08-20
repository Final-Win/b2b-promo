import { create } from 'zustand';

type PanelMode = 'create' | 'edit';

interface InitialDates {
  start_date: string;
  end_date: string;
}

interface WbsPanelState {
  isOpen: boolean;
  wbsId: string | null;
  mode: PanelMode;
  initialStartDate: string | null;
  initialEndDate: string | null;
  openCreate: (initialDates?: InitialDates) => void;
  openEdit: (wbsId: string) => void;
  close: () => void;
}

export const useWbsPanelStore = create<WbsPanelState>((set) => ({
  isOpen: false,
  wbsId: null,
  mode: 'create',
  initialStartDate: null,
  initialEndDate: null,
  openCreate: (initialDates) =>
    set({
      isOpen: true,
      wbsId: null,
      mode: 'create',
      initialStartDate: initialDates?.start_date ?? null,
      initialEndDate: initialDates?.end_date ?? null,
    }),
  openEdit: (wbsId) =>
    set({ isOpen: true, wbsId, mode: 'edit', initialStartDate: null, initialEndDate: null }),
  close: () => set({ isOpen: false, wbsId: null, initialStartDate: null, initialEndDate: null }),
}));
