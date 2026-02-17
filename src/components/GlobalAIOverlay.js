import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View, Platform, Animated, StatusBar } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { navigationRef } from '../../App'; 

export default function GlobalAIOverlay() {
  const { theme } = useTheme();
  const [currentRoute, setCurrentRoute] = useState("Home");
  
  // 🔥 Animasyon değeri
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Navigasyon takibi
  useEffect(() => {
    const unsubscribe = navigationRef.addListener('state', () => {
      const route = navigationRef.getCurrentRoute();
      if (route) setCurrentRoute(route.name);
    });
    return unsubscribe;
  }, []);

  // 🔥 ANIMASYON YÖNETİMİ: Sayfa her değiştiğinde kontrol et
  useEffect(() => {
    // Eğer görünür bir sayfadaysak animasyonu başlat
    if (currentRoute !== 'ChatScreen' && currentRoute !== 'Onboarding') {
      pulseAnim.setValue(1); // Başlangıç değerine çek
      
      const pulseAction = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { 
            toValue: 1.15, 
            duration: 1500, 
            useNativeDriver: true 
          }),
          Animated.timing(pulseAnim, { 
            toValue: 1, 
            duration: 1500, 
            useNativeDriver: true 
          })
        ])
      );
      
      pulseAction.start();

      // Sayfadan ayrılırken animasyonu durdur (bellek yönetimi için)
      return () => pulseAction.stop();
    }
  }, [currentRoute]); // 🔥 currentRoute değiştikçe bu efekt çalışır

  // Salla-Dertleş Sensörü
  useEffect(() => {
    let lastX, lastY, lastZ;
    const subscription = Accelerometer.addListener(data => {
      const { x, y, z } = data;
      if (lastX) {
        const diff = Math.abs(x + y + z - lastX - lastY - lastZ);
        if (diff > 3.2) handleShake(); 
      }
      lastX = x; lastY = y; lastZ = z;
    });
    Accelerometer.setUpdateInterval(100);
    return () => subscription.remove();
  }, [currentRoute]);

  const handleShake = () => {
    if (navigationRef.isReady() && currentRoute !== 'ChatScreen' && currentRoute !== 'Onboarding') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      openChatWithContext(false);
    }
  };

  const openChatWithContext = (isVoice = false) => {
    if (!navigationRef.isReady()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let contextMsg = "Selam Yoldaş! Bugün seninle manevi konularda hasbihal etmek istiyorum.";
    
    switch (currentRoute) {
      case 'Qibla': contextMsg = "Selam Yoldaş! Kıbleye yönelmenin manevi derinliği nedir?"; break;
      case 'Zikirmatik': contextMsg = "Yoldaş, zikir çekerken kalbimin mutmain olması için bana bir tavsiye verir misin?"; break;
      case 'Heritage': contextMsg = "Ecdadımızın camilerindeki o muazzam ruhu anlatır mısın?"; break;
      case 'HomeMain': contextMsg = "Bugün kendimi manevi olarak nasıl geliştirebilirim Yoldaş?"; break;
    }

    navigationRef.navigate('ChatScreen', { 
      initialMessage: contextMsg,
      startVoice: isVoice 
    });
  };

  // Chat veya Onboarding'de butonu tamamen gizle
  if (currentRoute === 'ChatScreen' || currentRoute === 'Onboarding') return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: theme.primary }]} 
          onPress={() => openChatWithContext(false)}
          onLongPress={() => openChatWithContext(true)} 
          activeOpacity={0.8}
        >
          <Sparkles color="#FFF" size={24} fill="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    ...StyleSheet.absoluteFillObject, 
    justifyContent: 'flex-start', 
    alignItems: 'flex-end', 
    padding: 20, 
    zIndex: 9999 
  },
  fab: {
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 8, 
    shadowColor: '#000', 
    shadowOpacity: 0.3, 
    shadowRadius: 5, 
    shadowOffset: { width: 0, height: 4 },
    marginTop: Platform.OS === 'ios' ? 45 : (StatusBar.currentHeight || 0) + 10,
    marginRight: -5 
  }
});