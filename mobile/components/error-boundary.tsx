import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled error caught by ErrorBoundary:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <ThemedView style={styles.container}>
          <ThemedText type="title">Something went wrong</ThemedText>
          <ThemedText style={styles.message}>
            {this.state.error.message || 'An unexpected error occurred.'}
          </ThemedText>
          <TouchableOpacity style={styles.button} onPress={this.reset}>
            <ThemedText style={styles.buttonText}>Try again</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  message: {
    textAlign: 'center',
    opacity: 0.7,
  },
  button: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#0a7ea4',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
