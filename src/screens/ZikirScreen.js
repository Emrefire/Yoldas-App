import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, SafeAreaView, 
  Animated, Dimensions, Platform, StatusBar, ScrollView 
} from 'react-native';
import { RotateCcw, Fingerprint, Volume2, VolumeX, Sparkles, HelpCircle, MessageCircle, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useTheme } from '../context/ThemeContext'; 
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(width * 0.72, 300);

export default function ZikirScreen() {
  const navigation = useNavigation();
  const { theme, isDarkMode } = useTheme(); 
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(33);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [showMessage, setShowMessage] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const messages = [
    "Maşallah, devam et! 🌟",
    "Allah kabul etsin. ✨",
    "Rabbim daim eylesin. 🙌",
    "Harika gidiyorsun! 💪",
    "Huzur zikirdedir... ❤️"
  ];
  const [currentMessage, setCurrentMessage] = useState(messages[0]);

  const startAIChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('ChatScreen', { 
      initialMessage: "Selam Yoldaş! Zikir çekmenin kalp üzerindeki manevi tesirini ve düzenli zikrin insan ruhuna verdiği huzuru anlatır mısın?" 
    });
  };

  async function playSuccessSound() {
    if (!isSoundOn) return;
    try {
      const { sound: playbackObject } = await Audio.Sound.createAsync(
          require('../../assets/sounds/success.mp3'),
          { shouldPlay: true }
      );
      playbackObject.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) playbackObject.unloadAsync();
      });
    } catch (error) { console.log("Ses hatası:", error); }
  }

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 40, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();

    const newCount = count + 1;
    setCount(newCount);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (newCount % target === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playSuccessSound();
      showSuccessFeedback();
    }
  };

  const showSuccessFeedback = () => {
    setCurrentMessage(messages[Math.floor(Math.random() * messages.length)]);
    setShowMessage(true);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true })
    ]).start(() => setShowMessage(false));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 25) + 10 : 0 }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* HEADER */}
        <View style={styles.headerContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Zikirmatik</Text>
          <Text style={[styles.headerSubtitle, { color: theme.subText }]}>Kalpler ancak Allah'ı anmakla huzur bulur.</Text>
        </View>

        {/* FEEDBACK AREA */}
        <View style={styles.messageWrapper}>
          {showMessage && (
            <Animated.View style={[styles.messageBadge, { opacity: fadeAnim, backgroundColor: theme.primary + '20', borderColor: theme.primary }]}>
              <Sparkles size={16} color={theme.primary} fill={theme.primary} />
              <Text style={[styles.messageText, { color: theme.primary }]}>{currentMessage}</Text>
            </Animated.View>
          )}
        </View>

        {/* MAIN COUNTER */}
        <View style={styles.counterSection}>
          <TouchableOpacity activeOpacity={1} onPress={handlePress}>
            <Animated.View style={[styles.circleOuter, { 
              width: CIRCLE_SIZE, 
              height: CIRCLE_SIZE, 
              borderRadius: CIRCLE_SIZE / 2, 
              backgroundColor: theme.card,
              borderColor: theme.primary,
              shadowColor: theme.primary,
              transform: [{ scale: scaleAnim }] 
            }]}>
              <View style={[styles.circleInner, { borderColor: theme.primary + '20' }]}>
                <Text style={[styles.countText, { color: theme.text }]}>{count}</Text>
                <View style={[styles.targetChip, { backgroundColor: theme.primary + '15' }]}>
                   <Text style={[styles.targetLabel, { color: theme.primary }]}>HEDEF: {target}</Text>
                </View>
              </View>
            </Animated.View>
          </TouchableOpacity>
          <Text style={[styles.hintText, { color: theme.subText }]}>Ekrana dokunarak zikre başlayın</Text>
        </View>

        {/* 🔥 MODERN AI PROMPT BOX */}
        <View style={styles.aiWrapper}>
            <TouchableOpacity 
                style={[styles.aiBox, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF', borderColor: theme.border }]} 
                onPress={startAIChat} 
                activeOpacity={0.8}
            >
                <View style={styles.aiBoxLeft}>
                    <View style={[styles.aiIconCircle, { backgroundColor: theme.primary }]}>
                        <Sparkles size={18} color="#FFF" fill="#FFF" />
                    </View>
                </View>
                
                <View style={styles.aiBoxCenter}>
                    <Text style={[styles.aiTitle, { color: theme.text }]}>Zikrin Sırrını Sor</Text>
                    <Text style={[styles.aiQuestion, { color: theme.subText }]} numberOfLines={1}>
                        "Zikrin manevi tesiri nedir?"
                    </Text>
                </View>

                <View style={styles.aiBoxRight}>
                    <ChevronRight size={20} color={theme.primary} />
                </View>
            </TouchableOpacity>
        </View>

        {/* Padding for Footer */}
        <View style={{ height: 160 }} />
      </ScrollView>

      {/* FIXED BOTTOM CONTROLS */}
      <View style={[styles.controlsContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableOpacity style={styles.controlBtn} onPress={() => { setCount(0); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); }}>
          <View style={[styles.iconBox, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7' }]}>
            <RotateCcw size={22} color={theme.text} />
          </View>
          <Text style={[styles.controlLabel, { color: theme.text }]}>Sıfırla</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.targetBtnWrapper} onPress={() => { setTarget(target === 33 ? 99 : target === 99 ? 100 : 33); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
          <View style={[styles.targetBtnMain, { backgroundColor: theme.primary }]}>
            <Fingerprint size={28} color="#FFF" />
          </View>
          <Text style={[styles.controlLabel, { color: theme.primary, fontWeight: '800' }]}>{target}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlBtn} onPress={() => { setIsSoundOn(!isSoundOn); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
          <View style={[styles.iconBox, { backgroundColor: isSoundOn ? theme.primary + '15' : '#FF3B3015' }]}>
            {isSoundOn ? <Volume2 size={22} color={theme.primary} /> : <VolumeX size={22} color="#FF3B30" />}
          </View>
          <Text style={[styles.controlLabel, { color: isSoundOn ? theme.primary : '#FF3B30' }]}>{isSoundOn ? 'Ses Açık' : 'Sessiz'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  
  headerContainer: { alignItems: 'center', marginTop: 15 },
  headerTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center', opacity: 0.7, fontWeight: '500' },

  messageWrapper: { height: 50, justifyContent: 'center', alignItems: 'center', marginVertical: 15 },
  messageBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
  messageText: { fontWeight: '700', marginLeft: 8, fontSize: 13 },

  counterSection: { alignItems: 'center', justifyContent: 'center' },
  circleOuter: { 
    justifyContent: 'center', alignItems: 'center', 
    borderWidth: 8, elevation: 20, 
    shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 15 
  },
  circleInner: { width: '92%', height: '92%', borderRadius: 1000, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderStyle: 'solid' },
  countText: { fontSize: 86, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  targetChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 5 },
  targetLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  hintText: { marginTop: 25, fontSize: 13, fontWeight: '600', opacity: 0.4 },

  aiWrapper: { marginTop: 40, width: '100%' },
  aiBox: { 
    flexDirection: 'row', alignItems: 'center', padding: 15, 
    borderRadius: 24, borderWidth: 1, elevation: 4,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10
  },
  aiBoxLeft: { marginRight: 15 },
  aiIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  aiBoxCenter: { flex: 1 },
  aiTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  aiQuestion: { fontSize: 13, fontWeight: '500', fontStyle: 'italic' },
  aiBoxRight: { marginLeft: 10 },

  controlsContainer: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', 
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 35 : 20, paddingTop: 15, 
    borderTopLeftRadius: 35, borderTopRightRadius: 35, elevation: 25,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 10
  },
  controlBtn: { alignItems: 'center' },
  iconBox: { width: 52, height: 52, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  controlLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  targetBtnWrapper: { alignItems: 'center', marginTop: -45 },
  targetBtnMain: { width: 75, height: 75, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 8, elevation: 12, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 }
});