import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, TextInput, 
  TouchableOpacity, FlatList, KeyboardAvoidingView, 
  Platform, Keyboard, Animated, Image, StatusBar, Alert 
} from 'react-native';
import { Send, ArrowLeft, Sparkles, Mic } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

// 🔥 Native Firebase Functions (App Check ile otomatik çalışır)
import functions from '@react-native-firebase/functions';

const YOLDAS_AVATAR = require('../../assets/yoldasavatar.png');

const WELCOME_MESSAGES = [
  "Selamün Aleyküm cancağızım! 👋\n\nBen Yoldaş. Manevi konularda hasbihal etmek, dertleşmek veya bilgi almak istersen buradayım. 🌿",
];

const TypewriterMessage = ({ text, theme, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 8); 
      return () => clearTimeout(timeout);
    } else {
      if (onComplete) onComplete();
    }
  }, [currentIndex, text]);

  return <Text style={[styles.messageText, { color: theme.text }]}>{displayedText}</Text>;
};

const TypingIndicator = ({ theme }) => {
  const [dots] = useState([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]);
  useEffect(() => {
    const anim = dots.map((dot, i) => 
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: -6, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true })
        ])
      )
    );
    anim.forEach(a => a.start());
    return () => anim.forEach(a => a.stop());
  }, []);

  return (
    <View style={[styles.typingBubble, { backgroundColor: theme.card }]}>
      <View style={styles.typingRow}>
        {dots.map((dot, i) => <Animated.View key={i} style={[styles.dot, { backgroundColor: theme.subText, transform: [{ translateY: dot }] }]} />)}
      </View>
    </View>
  );
};

function ChatContent() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme, isDarkMode } = useTheme();
  
  const [messages, setMessages] = useState([{ id: '1', text: WELCOME_MESSAGES[0], sender: 'bot', animate: false }]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputLocked, setInputLocked] = useState(false);
  
  const flatListRef = useRef();
  const inputRef = useRef(); 

  useEffect(() => {
    if (route.params?.initialMessage) setTimeout(() => sendMessage(route.params.initialMessage), 600);
  }, [route.params]);

  // 🔥 YENİ EKLENEN KOD: Sadece yeni mesaj geldiğinde 1 kere aşağı kaydırır.
  // Harfler daktilo gibi yazılırken ekranı zorla aşağı çekmez, sen rahatça gezinebilirsin.
  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length]); // Sadece mesaj listesinin sayısı değiştiğinde çalışır

  const startListening = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Yakında", "Sesli sohbet özelliği çok yakında gelecek! 🎙️");
  };

  const sendMessage = async (text) => {
    const userText = (text && typeof text === 'string') ? text : inputText;
    
    if (!userText.trim() || inputLocked) return;
    
    if (userText.length > 500) {
        Alert.alert("Çok Uzun", "Cancağızım, mesajın çok uzun. Biraz kısaltabilirsen daha iyi anlayabilirim.");
        return;
    }

    setMessages(prev => [...prev, { id: Date.now().toString(), text: userText, sender: 'user' }]);
    setInputText('');
    setLoading(true);
    setInputLocked(true);
    Keyboard.dismiss();

    try {
      const askYoldas = functions().httpsCallable('askYoldas');
      
      const securePrompt = `
        GÖREVİN: Sen "Yoldaş" adında samimi, dindar, bilge ve güvenilir bir yapay zeka asistanısın.
        
        🛑 KIRMIZI ÇİZGİLER (ASLA İHLAL ETME):
        1. KONU SINIRLAMASI: Sadece ve sadece **Dini (İslam), Manevi, Ahlaki, Tasavvufi konular ve Kişisel Dertleşme** hakkında konuşabilirsin.
        2. YASAKLI KONULAR: Spor, Siyaset, Teknoloji, Kodlama, Matematik, Coğrafya, Magazin, Yemek Tarifi vb. dünya işleri sorulursa CEVAP VERME.
        3. REDDETME MESAJI: Eğer kullanıcı yasaklı bir konu açarsa şu cümleyi kur: "Aziz dostum, ben sadece manevi konularda hasbihal etmek için tasarlandım. Gönül dünyana dair bir sorun varsa dinlerim."
        
        ✅ CEVAP TARZI:
        - Uzunluk: Konuyu eksik bırakma ama gereksiz uzatma. Öz ve doyurucu olsun.
        - Liste: Eğer namazın farzları gibi bir şey sorulursa maddeler halinde yaz.
        - Üslup: "Cancağızım", "Aziz dostum", "Güzel kardeşim" gibi samimi hitaplar kullan.
        
        Kullanıcı Sorusu: ${userText}
      `;

      const result = await askYoldas({
        prompt: securePrompt
      });

      const botResponse = result.data.answer; 

      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        text: botResponse, 
        sender: 'bot', 
        animate: true 
      }]);

    } catch (e) {
      console.error("Firebase Hatası:", e);
      setMessages(prev => [...prev, { 
        id: 'err', 
        text: "😔 Bağlantıda bir sorun oldu cancağızım. Birazdan tekrar dener misin?", 
        sender: 'bot' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
        {!isUser && <Image source={YOLDAS_AVATAR} style={styles.avatar} />}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble, { backgroundColor: isUser ? theme.primary : (isDarkMode ? '#2C2C2E' : '#FFF') }]}>
          {!isUser && item.animate ? (
            <TypewriterMessage text={item.text} theme={theme} onComplete={() => setInputLocked(false)} />
          ) : (
            <Text style={[styles.messageText, { color: isUser ? '#FFF' : theme.text }]}>{item.text}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 0 }]}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={24} color={theme.text} /></TouchableOpacity>
          <Image source={YOLDAS_AVATAR} style={styles.headerAvatar} />
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Yoldaş AI</Text>
            <View style={styles.onlineRow}><View style={styles.onlineDot} /><Text style={[styles.onlineText, { color: theme.primary }]}>Çevrimiçi</Text></View>
          </View>
        </View>
        <Sparkles size={22} color={theme.primary} fill={theme.primary + '20'} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}        
        ListFooterComponent={loading && <View style={styles.messageRow}><Image source={YOLDAS_AVATAR} style={styles.avatar} /><TypingIndicator theme={theme} /></View>}
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}>
        <View style={styles.inputArea}>
          <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity onPress={startListening} style={styles.actionBtn}>
                <Mic size={22} color={theme.primary} />
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: theme.text }]}
              placeholder={inputLocked ? "Yoldaş yazıyor..." : "İçini dök derman arayalım..."}
              placeholderTextColor={theme.subText}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500} 
              editable={!inputLocked}
            />
            <TouchableOpacity onPress={() => sendMessage()} disabled={!inputText.trim() || inputLocked} style={[styles.sendBtn, { backgroundColor: theme.primary }]}>
              <Send size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={{textAlign: 'right', fontSize: 10, color: theme.subText, marginRight: 10, marginTop: 4}}>
             {inputText.length}/500
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function ChatScreen(props) {
  return <ChatContent {...props} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, elevation: 3 },
  backBtn: { marginRight: 12 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  onlineRow: { flexDirection: 'row', alignItems: 'center' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 5 },
  onlineText: { fontSize: 12, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 30 },
  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  bubble: { padding: 14, borderRadius: 20, maxWidth: '80%', elevation: 1, shadowOpacity: 0.05 },
  userBubble: { borderBottomRightRadius: 4 },
  botBubble: { borderBottomLeftRadius: 4 },
  messageText: { fontSize: 16, lineHeight: 24 },
  typingBubble: { padding: 12, borderRadius: 18, borderBottomLeftRadius: 4 },
  typingRow: { flexDirection: 'row', alignItems: 'center', height: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 2 },
  inputArea: { padding: 12, paddingBottom: Platform.OS === 'ios' ? 25 : 15 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 30, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5 },
  actionBtn: { padding: 10 },
  input: { flex: 1, maxHeight: 100, paddingVertical: 8, fontSize: 16 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 5 }
});