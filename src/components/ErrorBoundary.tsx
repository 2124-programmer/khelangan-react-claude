import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('RENDER_ERROR', {
      component: info.componentStack?.split('\n')[1]?.trim() ?? 'unknown',
      // Never log error.message if it may contain user data; log the type instead
      errorType: error.name,
    }, error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.sub}>Please try again or restart the app.</Text>
          <TouchableOpacity style={styles.btn} onPress={this.handleRetry}>
            <Text style={styles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F8F9FA' },
  title:     { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  sub:       { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  btn:       { backgroundColor: '#22C55E', borderRadius: 10, paddingHorizontal: 28, paddingVertical: 12 },
  btnText:   { color: '#FFF', fontWeight: '600', fontSize: 15 },
});
