/**
 * Score-Adda Global Toast — Imperative API
 *
 * Adoption rules:
 *   Toast      → transient global feedback: request errors, success confirmations, non-blocking info.
 *   Inline msg → field-level validation that must sit next to its input.
 *   Modal      → deliberate full-screen confirmations (Booking Request, Cancel Booking, etc.) — keep as-is.
 *
 * Opt-out from the global MutationCache/QueryCache toast handler by setting
 *   meta: { suppressToast: true }
 * on a useMutation / useQuery call where you handle the error in custom UI.
 */

import { toastEmitter } from './emitter';
import type { ToastInput, ToastType } from './types';

type ShortcutOptions = Omit<ToastInput, 'type' | 'message'>;

function show(input: ToastInput): void {
  toastEmitter.emit(input);
}

function makeShortcut(type: ToastType) {
  return (message: string, opts?: ShortcutOptions): void =>
    show({ type, message, ...opts });
}

export const toast = {
  show,
  success: makeShortcut('success'),
  error: makeShortcut('error'),
  info: makeShortcut('info'),
  warning: makeShortcut('warning'),
} as const;

/** Convenience hook — returns the same imperative singleton. */
export function useToast(): typeof toast {
  return toast;
}
