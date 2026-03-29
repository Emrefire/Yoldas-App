import React, { Component } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Burada hatayı loglayabilirsin (Sentry, Firebase Crashlytics vs.)
    console.error("Global Hata Yakalandı:", error);
  }

  handleRestart = () => {
    // Basitçe state'i sıfırlayıp yeniden denemesini sağlarız (veya Updates.reloadAsync() kullanılabilir)
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.icon}>🤕</Text>
            <Text style={styles.title}>Küçük Bir Sorun Oluştu</Text>
            <Text style={styles.message}>
              Yoldaş şu an bir engelle karşılaştı. Endişelenme, bu geçici bir durum.
            </Text>
            <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
              <Text style={styles.buttonText}>Uygulamayı Yenile</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 30, alignItems: 'center' },
  icon: { fontSize: 60, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  message: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  button: { backgroundColor: '#2D5A27', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default GlobalErrorBoundary;