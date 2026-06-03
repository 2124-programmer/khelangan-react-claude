import { useState, useEffect } from 'react';

let _done = false;
const _subs = new Set<() => void>();

export function markSplashDone() {
  if (_done) return;
  _done = true;
  _subs.forEach(fn => fn());
  _subs.clear();
}

export function useSplashGate(): boolean {
  const [done, setDone] = useState(_done);
  useEffect(() => {
    if (_done) { setDone(true); return; }
    const fn = () => setDone(true);
    _subs.add(fn);
    return () => { _subs.delete(fn); };
  }, []);
  return done;
}
