export type PendingDest = { screen: string; params?: Record<string, unknown> } | null;

let _pending: PendingDest = null;

export function setPendingNav(dest: PendingDest): void {
  _pending = dest;
}

/** Read and clear in one call — safe to call from a mount effect. */
export function consumePendingNav(): PendingDest {
  const dest = _pending;
  _pending = null;
  return dest;
}
