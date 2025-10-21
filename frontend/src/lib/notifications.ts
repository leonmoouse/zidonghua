import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'error';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastStore {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { id: ++toastCounter, ...toast }]
    })),
  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((item) => item.id !== id)
    }))
}));

export const showError = (message: string) =>
  useToastStore.getState().push({ type: 'error', message });

export const showSuccess = (message: string) =>
  useToastStore.getState().push({ type: 'success', message });

export const showInfo = (message: string) =>
  useToastStore.getState().push({ type: 'info', message });
