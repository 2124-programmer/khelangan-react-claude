import React, { useEffect, useState } from 'react';
import { loadThemePref } from './src/store/themePreference';

/**
 * Tiny startup gate. It loads the persisted theme preference (async) BEFORE the app — and
 * therefore `src/theme`, which resolves the palette synchronously — are imported. `App` is
 * lazy-required only after the preference is cached, so the static theme reflects the user's
 * choice on launch. This file must not statically import `./App` or anything that pulls in the
 * theme, or the palette would resolve before the preference is known.
 */
export default function RootGate() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadThemePref().finally(() => setReady(true));
  }, []);

  if (!ready) return null; // native splash stays up; resolves in a few ms

  const App = require('./App').default;
  return <App />;
}
