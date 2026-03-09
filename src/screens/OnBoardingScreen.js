import React, { useState, useRef } from 'react';
import { 
  StyleSheet, View, Text, SafeAreaView, 
  FlatList, Animated, Dimensions, TouchableOpacity, Platform, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { Heart, Compass, Sparkles, Landmark, BookOpen, CheckCircle2, ArrowRight, Award } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

const { width, height } = Dimensions.get('window');
const IS_SMALL_SCREEN = height < 700;

const SLIDES = [
  {
    id: '1',
    title: 'Gönül Dünyana Hoş Geldin',
    description: 'Her güne özel seçilmiş taze bir Ayet, Hadis ve Esma ile maneviyatını besle. 📖',
    icon: BookOpen,
    color: '#2D5A27', 
  },
  {
    id: '2',
    title: 'Dert Ortağın Yoldaş',
    description: 'Manevi konularda aklına takılanları sor, dertleş. Yoldaş AI, samimi ve güvenilir cevaplarıyla hep yanında. ✨',
    icon: Sparkles,
    color: '#5856D6', 
  },
  {
    id: '3',
    title: 'Ecdadın İzinde',
    description: 'Osmanlı cami ve türbelerinin gizli kalmış hikayelerini keşfet, taşın duaya dönüşüne şahit ol. 🕌',
    icon: Landmark,
    color: '#D4AF37', 
  },
  {
    id: '4',
    title: 'Eğlenerek Öğren',
    description: 'Yoldaş AI destekli bilgi yarışmasıyla İslami bilgini test et. Serini bozma, jokerlerini akıllıca kullan! 🏆',
    icon: Award,
    color: '#E91E63', 
  },
  {
    id: '5',
    title: 'İstikrar ve Motivasyon',
    description: 'Günlük ibadet hedeflerini belirle, istikrar tablonu oluştur ve zinciri kırmadan devam et! 💪',
    icon: CheckCircle2,
    color: '#FF9500', 
  },
  {
    id: '6',
    title: 'Pusulan ve Vaktin',
    description: 'Kıble yönünü bul, namaz ve imsakiye vakitlerini asla kaçırma. Tüm manevi araçların tek bir yerde.',
    icon: Compass,
    color: '#007AFF', 
  }
];

export default function OnboardingScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets(); 
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef();

  const handleFinish = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await AsyncStorage.setItem('alreadyLaunched', 'true');
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (e) {
      console.log("Onboarding hatası:", e);
    }
  };

  const skipIntro = () => {
    Haptics.selectionAsync();
    handleFinish();
  };

  const goNext = () => {
    Haptics.selectionAsync();
    if (currentSlideIndex < SLIDES.length - 1) {
      flatListRef.current.scrollToIndex({ index: currentSlideIndex + 1 });
    } else {
      handleFinish();
    }
  };

  const renderItem = ({ item }) => {
    const IconComponent = item.icon;
    const iconBaseSize = IS_SMALL_SCREEN ? height * 0.11 : height * 0.15;

    return (
      <View style={styles.slide}>
        <View style={styles.centerContainer}>
            <View style={[styles.iconWrapper, { marginBottom: IS_SMALL_SCREEN ? 30 : 50 }]}>
              <View style={[styles.iconBg, { 
                  backgroundColor: item.color, 
                  opacity: 0.15,
                  width: iconBaseSize * 1.8,
                  height: iconBaseSize * 1.8,
                  borderRadius: iconBaseSize 
              }]} />
              <View style={[styles.iconCircle, { 
                  backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
                  width: iconBaseSize,
                  height: iconBaseSize,
                  borderRadius: iconBaseSize / 2,
                  borderColor: item.color + '40',
                  borderWidth: 2
              }]}>
                 <IconComponent size={iconBaseSize * 0.5} color={item.color} strokeWidth={2.5} />
              </View>
            </View>
            
            <View style={styles.textContainer}>
                <Text style={[styles.title, { color: theme.text, fontSize: IS_SMALL_SCREEN ? 26 : 32 }]}>
                    {item.title}
                </Text>
                <Text style={[styles.description, { color: theme.subText, fontSize: IS_SMALL_SCREEN ? 16 : 18 }]}>
                    {item.description}
                </Text>
            </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 10 : 0 }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <View style={styles.header}>
        {currentSlideIndex !== SLIDES.length - 1 && (
            <TouchableOpacity onPress={skipIntro} style={styles.skipButton}>
                <Text style={[styles.skipText, { color: theme.subText }]}>Atla</Text>
            </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            if (index !== currentSlideIndex) {
                setCurrentSlideIndex(index);
                Haptics.selectionAsync();
            }
        }}
        keyExtractor={(item) => item.id}
        bounces={false}
        scrollEventThrottle={16}
      />
      
      <View style={[styles.footer, { paddingBottom: (Platform.OS === 'ios' ? 40 : 25) + insets.bottom }]}>
        <View style={styles.indicatorRow}>
          {SLIDES.map((_, index) => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [10, 30, 10],
                extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.2, 1, 0.2],
                extrapolate: 'clamp',
            });
            return (
              <Animated.View 
                key={index} 
                style={[
                  styles.dot, 
                  { width: dotWidth, opacity, backgroundColor: SLIDES[index].color }
                ]} 
              />
            );
          })}
        </View>

        <TouchableOpacity 
          style={[
              styles.actionButton, 
              { backgroundColor: SLIDES[currentSlideIndex].color } 
          ]} 
          onPress={goNext}
          activeOpacity={0.9}
        >
          <Text style={styles.actionButtonText}>
            {currentSlideIndex === SLIDES.length - 1 ? 'Başlayalım' : 'Devam Et'}
          </Text>
          <ArrowRight size={22} color="#FFF" style={{ marginLeft: 10 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 50, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 25 },
  skipButton: { padding: 8, borderRadius: 12 },
  skipText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  slide: { width: width, flex: 1, justifyContent: 'center' },
  centerContainer: { alignItems: 'center', paddingHorizontal: 35 },
  
  iconWrapper: { alignItems: 'center', justifyContent: 'center' },
  iconBg: { position: 'absolute' },
  iconCircle: { 
      alignItems: 'center', justifyContent: 'center',
      shadowColor: "#000", shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.15, shadowRadius: 15, elevation: 15
  },

  textContainer: { alignItems: 'center' },
  title: { fontWeight: '900', textAlign: 'center', marginBottom: 18, letterSpacing: -0.8 },
  description: { textAlign: 'center', lineHeight: 28, fontWeight: '500', opacity: 0.9 },
  
  footer: { paddingHorizontal: 35, alignItems: 'center' },
  indicatorRow: { flexDirection: 'row', height: 10, justifyContent: 'center', marginBottom: 35 },
  dot: { height: 10, borderRadius: 5, marginHorizontal: 5 },
  
  actionButton: { 
    flexDirection: 'row', width: '100%', height: 65, 
    borderRadius: 22, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: {width: 0, height: 5},
    elevation: 8
  },
  actionButtonText: { color: '#FFF', fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
});