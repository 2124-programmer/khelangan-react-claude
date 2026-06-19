import type { ToastInput } from './types';

type ToastListener = (input: ToastInput) => void;

const listeners: ToastListener[] = [];

export const toastEmitter = {
  subscribe(listener: ToastListener): () => void {
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },
  emit(input: ToastInput): void {
    listeners.forEach((l) => l(input));
  },
};
