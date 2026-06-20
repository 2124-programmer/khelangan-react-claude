import React, { useCallback, useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { toastEmitter } from './emitter';
import { ToastItem } from './ToastItem';
import type { ToastEntry, ToastInput } from './types';

const MAX_VISIBLE = 3;
let nextId = 0;

/**
 * Mount exactly once at the app root (inside SafeAreaProvider, outside NavigationContainer).
 * Subscribes to the toast emitter and renders toasts in a Modal so they appear above
 * all sheets and modals in the app.
 */
export function ToastHost() {
  const [queue, setQueue] = useState<ToastEntry[]>([]);

  useEffect(() => {
    return toastEmitter.subscribe((input: ToastInput) => {
      setQueue((prev) => {
        if (prev.length >= MAX_VISIBLE) return prev;
        const entry: ToastEntry = { ...input, id: String(nextId++) };
        return [...prev, entry];
      });
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setQueue((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return (
    <Modal
      visible={queue.length > 0}
      transparent
      animationType="none"
      onRequestClose={() => {}}
    >
      <View style={styles.container} pointerEvents="box-none">
        {queue.map((entry, index) => (
          <ToastItem key={entry.id} entry={entry} index={index} onDismiss={dismiss} />
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    zIndex: 99999,
    elevation: 99999,
  },
});
