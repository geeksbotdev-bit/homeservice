import React from 'react';
import { View, ScrollView, Pressable, Text } from 'react-native';

interface State { error: Error | null; info: string }

/**
 * Catches JS/render errors anywhere below it and shows the message on screen
 * (instead of the app silently closing in a release build). This makes crashes
 * diagnosable — the visible text is the actual error + component stack.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, info: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }
  componentDidCatch(error: Error, info: { componentStack?: string }) {
    this.setState({ error, info: info?.componentStack ?? '' });
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children as any;
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 60 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#DC2626', marginBottom: 10 }}>Something went wrong</Text>
          <Text style={{ fontSize: 14, color: '#1F2937', marginBottom: 8 }}>{String(error?.message || error)}</Text>
          <Text selectable style={{ fontSize: 12, color: '#6B7280', fontFamily: 'monospace' }}>{String(error?.stack || '')}</Text>
          {!!info && <Text selectable style={{ fontSize: 11, color: '#9CA3AF', marginTop: 12 }}>{info}</Text>}
          <Pressable
            onPress={() => this.setState({ error: null, info: '' })}
            style={{ marginTop: 24, backgroundColor: '#0B7C82', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Try again</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

export default ErrorBoundary;
