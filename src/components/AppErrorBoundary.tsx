import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const LAST_CRASH_KEY = '@snapschool_last_ui_crash';

type State = {
  error: Error | null;
  restarting: boolean;
};

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null, restarting: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, restarting: false };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const report = {
      at: new Date().toISOString(),
      message: error?.message || String(error),
      stack: error?.stack || null,
      componentStack: info.componentStack || null,
      updateId: Updates.updateId || null,
      runtimeVersion: Updates.runtimeVersion || null,
    };

    console.error('[APP-UI-CRASH]', report);
    void AsyncStorage.setItem(LAST_CRASH_KEY, JSON.stringify(report)).catch(() => undefined);
  }

  private restart = async () => {
    this.setState({ restarting: true });
    try {
      if (!__DEV__) {
        await Updates.reloadAsync();
        return;
      }
    } catch (error) {
      console.warn('[APP-RESTART-FAIL]', error);
    }
    this.setState({ error: null, restarting: false });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.screen}>
        <View style={styles.mark}><Text style={styles.markText}>!</Text></View>
        <Text style={styles.title}>Un problème est survenu</Text>
        <Text style={styles.body}>SnapSchool a protégé votre session. Redémarrez l’application pour continuer.</Text>
        <TouchableOpacity style={styles.button} onPress={this.restart} disabled={this.state.restarting} activeOpacity={0.85}>
          <Text style={styles.buttonText}>{this.state.restarting ? 'Redémarrage…' : 'Redémarrer'}</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F9FC', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  mark: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0ED', marginBottom: 20 },
  markText: { color: '#C94332', fontSize: 28, fontWeight: '900' },
  title: { color: '#172033', fontSize: 21, fontWeight: '900', textAlign: 'center' },
  body: { color: '#667085', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 9, maxWidth: 320 },
  button: { marginTop: 24, minWidth: 180, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, backgroundColor: '#1769C2', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
