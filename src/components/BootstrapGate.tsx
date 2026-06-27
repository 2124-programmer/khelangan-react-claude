/**
 * Full-screen retry OVERLAY for a failed cold-start session restore.
 *
 * This is intentionally an overlay, not a route: navigation must always work, and a backend being
 * down is a data problem. When `bootstrapError` is set (a non-auth failure during session restore —
 * see AuthContext), we cover the app with a centered retry surface that re-runs bootstrap on tap.
 * The user is still authenticated; nothing has been logged out.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '../store/AuthContext';
import { ErrorState } from './common';

export function BootstrapGate() {
  const { bootstrapError, isLoading, retryBootstrap } = useAuth();

  // Only show once the in-flight attempt has settled with a non-auth error.
  if (!bootstrapError || isLoading) return null;

  return (
    <View style={styles.overlay}>
      <ErrorState
        kind={bootstrapError}
        onRetry={retryBootstrap}
        title={bootstrapError === 'offline' ? "You're offline" : "Couldn't reach Score-Adda"}
        subtitle="We couldn't load your session. Check your connection and try again."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});

export default BootstrapGate;
