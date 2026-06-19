export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastInput {
  type: ToastType;
  message: string;
  title?: string;
  /** Override auto-dismiss duration in ms. Defaults vary by type. */
  duration?: number;
  action?: ToastAction;
}

export interface ToastEntry extends ToastInput {
  id: string;
}
