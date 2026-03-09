import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity, 
  Platform, StatusBar, ActivityIndicator, Alert, Animated, Easing, Dimensions, Modal
} from 'react-native';
import { 
  ArrowLeft, CheckCircle2, XCircle, Award, Sparkles, 
  RefreshCcw, BrainCircuit, Star, Zap, HelpCircle, Flame, Wand2, Bot, X
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

// 🔥 Yerel sorular
import { localQuestions } from '../database/quizQuestions';
// 🔥 Yapay Zeka bağlantısı
import functions from '@react-native-firebase/functions';

const { width } = Dimensions.get('window');
const CARD_GAP = 14;
const OPTION_WIDTH = (width - 40 - CARD_GAP) / 2; // 2x2 Grid için genişlik hesaplama
const TOTAL_TIME = 15; // Her soru için 15 saniye

const MOTIVATION_MSGS = [
  "Maşallah! 🌟", "Harika gidiyorsun! 👏", "Çok iyi! ✨", 
  "Kusursuz! 🎯", "İlmin artsın! 📚", "Tebrikler! 🏆", "Zihnine sağlık! 🌿"
];

export default function QuizScreen() {
  const navigation = useNavigation();
  const { theme, isDarkMode } = useTheme();

  const [activeQuestions, setActiveQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false); 
  const [isAIMode, setIsAIMode] = useState(false); 
  const [motivationText, setMotivationText] = useState("");

  // ⏳ Zamanlayıcı ve Joker Durumları
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [joker5050Used, setJoker5050Used] = useState(false);
  const [jokerHintUsed, setJokerHintUsed] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState([]);
  const [hintModalVisible, setHintModalVisible] = useState(false);

  // Animasyon Değerleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scoreScaleAnim = useRef(new Animated.Value(1)).current; 
  const motivationAnim = useRef(new Animated.Value(0)).current; 
  const shakeAnim = useRef(new Animated.Value(0)).current; // Yanlış cevap titremesi
  const timerAnim = useRef(new Animated.Value(1)).current; 

  useEffect(() => {
    loadLocalQuestions();
  }, []);

  // ⏳ Zamanlayıcı Mantığı
  useEffect(() => {
    if (activeQuestions.length > 0 && !isFinished && !isAnswered && !hintModalVisible) {
      if (timeLeft > 0) {
        const timerId = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
        
        // Son 3 saniyede kalp atışı gibi titreşim ve animasyon
        if (timeLeft <= 4) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        Animated.timing(timerAnim, {
          toValue: timeLeft / TOTAL_TIME,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: false
        }).start();

        return () => clearTimeout(timerId);
      } else if (timeLeft === 0) {
        handleTimeOut();
      }
    }
  }, [timeLeft, isFinished, isAnswered, hintModalVisible, activeQuestions.length]);

  useEffect(() => {
    if (activeQuestions.length > 0 && !isFinished) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      Animated.timing(progressAnim, {
        toValue: (currentQuestionIndex + 1) / activeQuestions.length,
        duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: false,
      }).start();
      
      // Soru değiştiğinde zamanı sıfırla
      setTimeLeft(TOTAL_TIME);
      setHiddenOptions([]);
      timerAnim.setValue(1);
    }
  }, [currentQuestionIndex, activeQuestions, isFinished]);

  const loadLocalQuestions = () => {
    const shuffled = [...localQuestions].sort(() => 0.5 - Math.random());
    setActiveQuestions(shuffled.slice(0, 10)); 
    setIsAIMode(false);
    resetGameState();
  };

  const resetGameState = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setStreak(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setIsFinished(false);
    setJoker5050Used(false);
    setJokerHintUsed(false);
    setHiddenOptions([]);
    progressAnim.setValue(0);
  };

  const generateAIQuestions = async () => {
    setIsAILoading(true);
    resetGameState();
    try {
      const askYoldas = functions().httpsCallable('askYoldas');
      const prompt = `Bana İslami konularda orta zorlukta 5 adet bilgi yarışması sorusu hazırla. Sadece JSON array formatında cevap ver. [{"question": "Soru metni","options": ["Şık A", "Şık B", "Şık C", "Şık D"],"answerIndex": 0}]`;
      const result = await askYoldas({ prompt });
      let aiResponse = result.data.answer.replace(/```json/g, '').replace(/```/g, '').trim();
      const newQuestions = JSON.parse(aiResponse);
      if (Array.isArray(newQuestions) && newQuestions.length > 0) {
        setActiveQuestions(newQuestions);
        setIsAIMode(true);
      } else throw new Error("Geçersiz format");
    } catch (error) {
      Alert.alert("Yoldaş yoruldu 😔", "Yerel havuzumuzla devam edelim.");
      loadLocalQuestions(); 
    } finally {
      setIsAILoading(false);
    }
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const showMotivation = (currentStreak) => {
    const randMsg = MOTIVATION_MSGS[Math.floor(Math.random() * MOTIVATION_MSGS.length)];
    const textToShow = currentStreak > 1 ? `${randMsg} 🔥 ${currentStreak}x Seri!` : randMsg;
    setMotivationText(textToShow);
    motivationAnim.setValue(0);
    Animated.sequence([
      Animated.timing(motivationAnim, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
      Animated.delay(1000),
      Animated.timing(motivationAnim, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start();
  };

  const handleTimeOut = () => {
    setIsAnswered(true);
    setStreak(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    triggerShake();
    moveToNextQuestion();
  };

  const handleOptionPress = (index) => {
    if (isAnswered || hiddenOptions.includes(index)) return;
    setSelectedOption(index);
    setIsAnswered(true);
    
    const currentQuestion = activeQuestions[currentQuestionIndex];

    if (index === currentQuestion.answerIndex) {
      setScore(prev => prev + 10 + (timeLeft > 10 ? 2 : 0)); // Hızlı cevap bonusu!
      const newStreak = streak + 1;
      setStreak(newStreak);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showMotivation(newStreak);
      Animated.sequence([
        Animated.timing(scoreScaleAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.timing(scoreScaleAnim, { toValue: 1, duration: 150, useNativeDriver: true })
      ]).start();
    } else {
      setStreak(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      triggerShake();
    }
    moveToNextQuestion();
  };

  const moveToNextQuestion = () => {
    setTimeout(() => {
      if (currentQuestionIndex < activeQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedOption(null);
        setIsAnswered(false);
      } else {
        setIsFinished(true);
      }
    }, 2000); 
  };

  // 🔥 50/50 Joker Fonksiyonu
  const use5050Joker = () => {
    if (joker5050Used || isAnswered) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setJoker5050Used(true);
    const currentQ = activeQuestions[currentQuestionIndex];
    const wrongIndexes = [0, 1, 2, 3].filter(i => i !== currentQ.answerIndex);
    const toHide = wrongIndexes.sort(() => 0.5 - Math.random()).slice(0, 2);
    setHiddenOptions(toHide);
  };

  // 🔥 AI İpucu Joker Fonksiyonu
  const useHintJoker = () => {
    if (jokerHintUsed || isAnswered) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setJokerHintUsed(true);
    setHintModalVisible(true);
  };

  const optionLetters = ['A', 'B', 'C', 'D'];

  const getOptionStyle = (index) => {
    if (hiddenOptions.includes(index)) return { opacity: 0, height: 0, padding: 0, borderWidth: 0 }; 
    if (!isAnswered) return { backgroundColor: theme.card, borderColor: isDarkMode ? '#333' : '#E5E5EA', borderWidth: 1.5 };
    
    const currentQuestion = activeQuestions[currentQuestionIndex];
    if (index === currentQuestion.answerIndex) return { backgroundColor: '#4CAF5015', borderColor: '#4CAF50', borderWidth: 2 }; 
    if (index === selectedOption && index !== currentQuestion.answerIndex) return { backgroundColor: '#FF3B3015', borderColor: '#FF3B30', borderWidth: 2 }; 
    return { backgroundColor: theme.card, borderColor: isDarkMode ? '#333' : '#E5E5EA', borderWidth: 1.5, opacity: 0.4 };
  };

  const getLetterStyle = (index) => {
    if (!isAnswered) return { backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7', color: theme.text };
    const currentQuestion = activeQuestions[currentQuestionIndex];
    if (index === currentQuestion.answerIndex) return { backgroundColor: '#4CAF50', color: '#FFF' };
    if (index === selectedOption && index !== currentQuestion.answerIndex) return { backgroundColor: '#FF3B30', color: '#FFF' };
    return { backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7', color: theme.subText };
  };

  // Zaman Çubuğu Renk Dinamiği
  const timerColor = timeLeft > 7 ? '#4CAF50' : timeLeft > 3 ? '#FFCC00' : '#FF3B30';
  const timerWidth = timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  if (isAILoading || activeQuestions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{color: theme.text, marginTop: 24, fontSize: 16, fontWeight: '600'}}>Yoldaş soruları hazırlıyor... 🌿</Text>
      </SafeAreaView>
    );
  }

  if (isFinished) {
    const percentage = (score / (activeQuestions.length * 10)) * 100;
    const isPerfect = percentage >= 90;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 0 }]}>
        <View style={styles.resultContainer}>
          <Animated.View style={[styles.iconCircle, { backgroundColor: isPerfect ? '#FFD70015' : theme.primary + '15', borderColor: isPerfect ? '#FFD700' : theme.primary, borderWidth: 2 }]}>
            {isPerfect ? <Award size={60} color="#FFD700" /> : <Star size={60} color={theme.primary} />}
          </Animated.View>
          <Text style={[styles.resultTitle, { color: theme.text }]}>{isPerfect ? "Kusursuz!" : "Tebrikler!"}</Text>
          <View style={[styles.scorePill, { backgroundColor: theme.card }]}>
            <Text style={[styles.scoreText, { color: theme.primary }]}>{score}</Text>
            <Text style={[styles.scoreDivider, { color: theme.subText }]}>Puan</Text>
          </View>
          <Text style={[styles.resultDesc, { color: theme.subText }]}>
            {isPerfect ? "Mükemmel bir bilgi birikimin var! Maşallah 🌟" : "Çok iyi gidiyorsun, pratik yapmaya devam et! 📚"}
          </Text>
          <View style={styles.actionButtonsWrapper}>
            <TouchableOpacity onPress={loadLocalQuestions} style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: isDarkMode ? '#333' : '#E5E5EA', borderWidth: 1.5 }]}>
              <RefreshCcw size={20} color={theme.text} />
              <Text style={[styles.actionBtnText, { color: theme.text }]}>Yeniden Çöz</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={generateAIQuestions} style={[styles.actionBtn, { backgroundColor: theme.primary, marginTop: 14 }]}>
              <Sparkles size={20} color="#FFF" />
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Yoldaş AI ile Üret</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = activeQuestions[currentQuestionIndex];
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 0 }]}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: theme.card }]}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.subText }]}>SORU {currentQuestionIndex + 1}/{activeQuestions.length}</Text>
          <View style={[styles.timerContainer, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7' }]}>
             <Animated.View style={[styles.timerBar, { backgroundColor: timerColor, width: timerWidth }]} />
          </View>
        </View>

        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          {streak >= 2 && (
            <Animated.View style={[styles.streakBadge, { transform: [{scale: scoreScaleAnim}] }]}>
              <Flame size={20} color="#FF9500" fill="#FF9500" />
              <Text style={styles.streakText}>{streak}</Text>
            </Animated.View>
          )}
          <Animated.View style={[styles.scoreBadge, { backgroundColor: theme.primary + '15', transform: [{scale: scoreScaleAnim}] }]}>
            <Text style={[styles.scoreBadgeText, { color: theme.primary }]}>{score}</Text>
          </Animated.View>
        </View>
      </View>

      {/* İLERLEME ÇUBUĞU */}
      <View style={styles.progressWrapper}>
        <View style={[styles.progressBarContainer, { backgroundColor: isDarkMode ? '#2C2C2E' : '#E5E5EA' }]}>
          <Animated.View style={[styles.progressBarFill, { backgroundColor: theme.primary, width: progressWidth }]} />
        </View>
      </View>

      {/* MOTİVASYON TOAST */}
      <Animated.View style={[styles.motivationBadge, { 
        backgroundColor: theme.text, opacity: motivationAnim,
        transform: [{ translateY: motivationAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
      }]}>
        <Text style={[styles.motivationText, { color: theme.background }]}>{motivationText}</Text>
      </Animated.View>

      <Animated.ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} style={{ opacity: fadeAnim, transform: [{translateX: shakeAnim}] }}>
        
        {/* SORU KARTI & KATEGORİ HAPI */}
        <View style={[styles.questionCard, { backgroundColor: theme.card, shadowColor: theme.primary }]}>
          <View style={[styles.categoryPill, { backgroundColor: theme.background }]}>
            <Text style={[styles.categoryText, { color: theme.subText }]}>📚 İslami Bilgi</Text>
          </View>
          <Text style={[styles.questionText, { color: theme.text }]}>{currentQuestion.question}</Text>
        </View>

        {/* 2X2 ŞIKLAR (GRID) */}
        <View style={styles.gridContainer}>
          {currentQuestion.options.map((option, index) => {
            if (hiddenOptions.includes(index)) return null; 
            const letterStyle = getLetterStyle(index);
            const isCorrect = isAnswered && index === currentQuestion.answerIndex;
            const isWrong = isAnswered && selectedOption === index && index !== currentQuestion.answerIndex;

            return (
              <TouchableOpacity 
                key={index} 
                activeOpacity={0.7}
                onPress={() => handleOptionPress(index)}
                style={[styles.gridOptionBtn, getOptionStyle(index)]}
              >
                <View style={styles.gridTopRow}>
                  <View style={[styles.letterBox, { backgroundColor: letterStyle.backgroundColor }]}>
                    <Text style={[styles.letterText, { color: letterStyle.color }]}>{optionLetters[index]}</Text>
                  </View>
                  {isCorrect && <CheckCircle2 size={24} color="#4CAF50" />}
                  {isWrong && <XCircle size={24} color="#FF3B30" />}
                </View>
                <Text style={[styles.gridOptionText, { color: theme.text }]} numberOfLines={4} adjustsFontSizeToFit>{option}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* 🔥 JOKERLER ALANI */}
        <View style={styles.jokersContainer}>
          <TouchableOpacity 
            onPress={use5050Joker} 
            disabled={joker5050Used || isAnswered}
            style={[styles.jokerBtn, { backgroundColor: joker5050Used ? (isDarkMode ? '#222' : '#F0F0F0') : theme.card, borderColor: isDarkMode ? '#333' : '#E5E5EA', opacity: joker5050Used ? 0.5 : 1 }]}
          >
            <View style={[styles.jokerIconBox, { backgroundColor: '#AF52DE15' }]}>
              <Wand2 size={20} color="#AF52DE" />
            </View>
            <View>
              <Text style={[styles.jokerTitle, { color: theme.text }]}>%50 Yarı Yarıya</Text>
              <Text style={[styles.jokerSub, { color: theme.subText }]}>{joker5050Used ? 'Kullanıldı' : '2 yanlışı sil'}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={useHintJoker} 
            disabled={jokerHintUsed || isAnswered}
            style={[styles.jokerBtn, { backgroundColor: jokerHintUsed ? (isDarkMode ? '#222' : '#F0F0F0') : theme.card, borderColor: isDarkMode ? '#333' : '#E5E5EA', opacity: jokerHintUsed ? 0.5 : 1 }]}
          >
            <View style={[styles.jokerIconBox, { backgroundColor: '#007AFF15' }]}>
              <Bot size={20} color="#007AFF" />
            </View>
            <View>
              <Text style={[styles.jokerTitle, { color: theme.text }]}>Yoldaş'a Sor</Text>
              <Text style={[styles.jokerSub, { color: theme.subText }]}>{jokerHintUsed ? 'Kullanıldı' : 'Yapay zeka ipucu'}</Text>
            </View>
          </TouchableOpacity>
        </View>

      </Animated.ScrollView>

      {/* 🔥 AI İPUCU MODALI */}
      <Modal visible={hintModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Bot size={24} color={theme.primary} />
                <Text style={[styles.modalTitle, { color: theme.text, marginLeft: 10 }]}>Yoldaş'ın İpucu</Text>
              </View>
              <TouchableOpacity onPress={() => setHintModalVisible(false)}><X size={24} color={theme.subText}/></TouchableOpacity>
            </View>
            <Text style={[styles.modalText, { color: theme.text }]}>
              "Doğru cevabın <Text style={{fontWeight: 'bold', color: theme.primary}}>{currentQuestion?.options[currentQuestion?.answerIndex]}</Text> ile yakından bir ilgisi var gibi hissediyorum. Güven bana! 🌿"
            </Text>
            <TouchableOpacity onPress={() => setHintModalVisible(false)} style={[styles.modalBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.modalBtnText}>Teşekkürler Yoldaş</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10, marginTop: 5 },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  
  // Timer Bar
  timerContainer: { width: 120, height: 6, borderRadius: 3, overflow: 'hidden' },
  timerBar: { height: '100%', borderRadius: 3 },

  scoreBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  scoreBadgeText: { fontWeight: '900', fontSize: 16 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF950015', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15, marginRight: 8 },
  streakText: { color: '#FF9500', fontWeight: 'bold', fontSize: 14, marginLeft: 4 },
  
  progressWrapper: { paddingHorizontal: 25, marginTop: 10, marginBottom: 5, zIndex: 1 },
  progressBarContainer: { height: 6, width: '100%', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  
  motivationBadge: { position: 'absolute', top: 120, alignSelf: 'center', zIndex: 100, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 15 },
  motivationText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  content: { padding: 20, paddingBottom: 50 },
  
  questionCard: { 
    padding: 28, paddingTop: 35, borderRadius: 30, marginBottom: 25, 
    minHeight: 160, alignItems: 'center', justifyContent: 'center',
    elevation: 10, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20,
    marginTop: 15, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)'
  },
  categoryPill: { position: 'absolute', top: -15, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  categoryText: { fontSize: 12, fontWeight: '700' },
  questionText: { fontSize: 19, fontWeight: '700', textAlign: 'center', lineHeight: 28 },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: CARD_GAP },
  gridOptionBtn: { width: OPTION_WIDTH, padding: 16, borderRadius: 24, minHeight: 130, justifyContent: 'flex-start', marginBottom: CARD_GAP },
  gridTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, width: '100%' },
  letterBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  letterText: { fontSize: 15, fontWeight: '800' },
  gridOptionText: { fontSize: 15, fontWeight: '600', lineHeight: 22, flex: 1 },

  jokersContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 10 },
  jokerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 20, borderWidth: 1 },
  jokerIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  jokerTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  jokerSub: { fontSize: 11, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalText: { fontSize: 17, lineHeight: 26, marginBottom: 30 },
  modalBtn: { paddingVertical: 16, borderRadius: 20, alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  resultTitle: { fontSize: 32, fontWeight: '900', marginBottom: 16, textAlign: 'center' },
  scorePill: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30, marginBottom: 20, elevation: 2 },
  scoreText: { fontSize: 36, fontWeight: '900' },
  scoreDivider: { fontSize: 18, fontWeight: '700', marginLeft: 6 },
  resultDesc: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 40, paddingHorizontal: 20 },
  actionButtonsWrapper: { width: '100%' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 24, width: '100%', gap: 10 },
  actionBtnText: { fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 }
});