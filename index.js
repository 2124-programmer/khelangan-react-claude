import { registerRootComponent } from 'expo';

import RootGate from './RootGate';

// Custom entry: RootGate loads the saved theme preference before importing the app + theme,
// so the chosen Light/Dark/System palette applies on launch. (Replaces expo/AppEntry.)
registerRootComponent(RootGate);
