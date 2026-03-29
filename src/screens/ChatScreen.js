import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, TextInput, 
  TouchableOpacity, FlatList, KeyboardAvoidingView, 
  Platform, Keyboard, Animated, Image, StatusBar, Alert, Modal
} from 'react-native';
import { Send, ArrowLeft, Trash2, Square, Plus, Menu, MessageSquare, X } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import functions from '@react-native-firebase/functions';

const YOLDAS_AVATAR = require('../../assets/yoldasavatar.webp');
const CHAT_SESSIONS_KEY = 'yoldas_chat_sessions_v1'; 

const WELCOME_MESSAGES = [
  "Selamün Aleyküm cancağızım! 👋\n\nBen Yoldaş. Manevi konularda hasbihal etmek, dertleşmek veya bilgi almak istersen buradayım. 🌿",
];

const renderFormattedText = (text, theme, isUser) => {
  if (!text) return null; 

  if (isUser) {
    return <Text style={[styles.messageText, { color: '#FFF' }]}>{text}</Text>;
  }

  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return (
    <Text style={[styles.messageText, { color: theme.text }]}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={index} style={{ fontWeight: 'bold', fontSize: 17 }}>
              {part.substring(2, part.length - 2)}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
};

const TypewriterMessage = ({ text, theme, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!text) {
      if (onComplete) onComplete();
      return;
    }
    
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

  return renderFormattedText(displayedText, theme, false);
};

// 🔥 PROFESYONEL DİNAMİK BEKLEME ANİMASYONU
const TypingIndicator = ({ theme }) => {
  const [dots] = useState([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]);
  const [statusText, setStatusText] = useState("Yoldaş düşünüyor...");

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

    // Bekleme hissini azaltmak için her 4 saniyede bir yazıyı değiştiriyoruz
    const texts = [
      "Yoldaş düşünüyor...",
      "Kaynaklar taranıyor...",
      "Cevap derleniyor...",
      "Az kaldı cancağızım..."
    ];
    let step = 0;
    const textInterval = setInterval(() => {
      step = (step + 1) % texts.length;
      setStatusText(texts[step]);
    }, 4000);

    return () => {
      anim.forEach(a => a.stop());
      clearInterval(textInterval);
    };
  }, []);

  return (
    <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
      <View style={[styles.typingBubble, { backgroundColor: theme.card }]}>
        <View style={styles.typingRow}>
          {dots.map((dot, i) => <Animated.View key={i} style={[styles.dot, { backgroundColor: theme.subText, transform: [{ translateY: dot }] }]} />)}
        </View>
      </View>
      <Text style={{ fontSize: 11, color: theme.subText, marginTop: 4, marginLeft: 5, fontStyle: 'italic' }}>
        {statusText}
      </Text>
    </View>
  );
};

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute(); 
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets(); 
  
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputLocked, setInputLocked] = useState(false);
  
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const flatListRef = useRef();
  const inputRef = useRef(); 
  const abortControllerRef = useRef(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (activeSessionId && route.params?.initialMessage) {
      const incomingMessage = route.params.initialMessage;
      setInputText(incomingMessage);
      navigation.setParams({ initialMessage: undefined });
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [activeSessionId, route.params?.initialMessage]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length]); 

  const loadSessions = async () => {
    try {
      const savedSessions = await AsyncStorage.getItem(CHAT_SESSIONS_KEY);
      let parsedSessions = savedSessions ? JSON.parse(savedSessions) : [];

      if (parsedSessions.length > 0) {
        setSessions(parsedSessions);
        const latestSession = parsedSessions[0];
        setActiveSessionId(latestSession.id);
        setMessages(latestSession.messages.map(m => ({...m, animate: false})));
      } else {
        createNewChat(); 
      }
    } catch (e) {
      console.log("Oturumlar yüklenemedi", e);
      createNewChat();
    }
  };

  const createNewChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSessionId = Date.now().toString();
    const initialMessages = [{ id: '1', text: WELCOME_MESSAGES[0], sender: 'bot', animate: false }];
    
    const newSession = {
      id: newSessionId,
      title: 'Yeni Sohbet',
      updatedAt: Date.now(),
      messages: initialMessages
    };

    setSessions(prev => {
      const updated = [newSession, ...prev];
      AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(updated));
      return updated;
    });

    setActiveSessionId(newSessionId);
    setMessages(initialMessages);
    setMenuVisible(false);
    setInputText('');
  };

  const switchSession = (sessionId) => {
    Haptics.selectionAsync();
    const sessionToLoad = sessions.find(s => s.id === sessionId);
    if (sessionToLoad) {
      setActiveSessionId(sessionId);
      setMessages(sessionToLoad.messages.map(m => ({...m, animate: false})));
      setMenuVisible(false);
      setInputText('');
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setLoading(false);
      setInputLocked(false);
    }
  };

  const deleteSession = (sessionId) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Sohbeti Sil",
      "Bu sohbet geçmişini silmek istediğine emin misin?",
      [
        { text: "Vazgeç", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive", 
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSessions(prev => {
              const updated = prev.filter(s => s.id !== sessionId);
              AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(updated));
              
              if (sessionId === activeSessionId) {
                if (updated.length > 0) {
                  setActiveSessionId(updated[0].id);
                  setMessages(updated[0].messages.map(m => ({...m, animate: false})));
                } else {
                  const newId = Date.now().toString();
                  const initialMsg = [{ id: '1', text: WELCOME_MESSAGES[0], sender: 'bot', animate: false }];
                  const newSes = { id: newId, title: 'Yeni Sohbet', updatedAt: Date.now(), messages: initialMsg };
                  updated.push(newSes);
                  AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(updated));
                  setActiveSessionId(newId);
                  setMessages(initialMsg);
                }
              }
              return updated;
            });
          }
        }
      ]
    );
  };

  const updateSessionData = (newMessages, userMessageText = null) => {
    setSessions(prevSessions => {
      let updatedSessions = [...prevSessions];
      const sessionIndex = updatedSessions.findIndex(s => s.id === activeSessionId);
      
      if (sessionIndex > -1) {
        updatedSessions[sessionIndex].messages = newMessages.slice(-50); 
        updatedSessions[sessionIndex].updatedAt = Date.now();
        
        if (userMessageText && updatedSessions[sessionIndex].title === 'Yeni Sohbet') {
          let newTitle = userMessageText.substring(0, 25);
          if (userMessageText.length > 25) newTitle += '...';
          updatedSessions[sessionIndex].title = newTitle;
        }
      }
      
      updatedSessions.sort((a, b) => b.updatedAt - a.updatedAt);
      AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(updatedSessions));
      return updatedSessions;
    });
  };

  const stopAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setLoading(false);
    setInputLocked(false);
    const resolvedMessages = messages.map(msg => msg.animate ? { ...msg, animate: false } : msg);
    setMessages(resolvedMessages);
    updateSessionData(resolvedMessages);
  };

  const sendMessage = async (text) => {
    const userText = (text && typeof text === 'string') ? text : inputText;
    
    if (!userText.trim() || inputLocked) return;
    
    if (userText.length > 500) {
        Alert.alert("Çok Uzun", "Cancağızım, mesajın çok uzun. Biraz kısaltabilirsen daha iyi anlayabilirim.");
        return;
    }

    const userMsgObj = { id: Date.now().toString(), text: userText, sender: 'user' };
    let updatedMessages = [...messages, userMsgObj];
    setMessages(updatedMessages);
    updateSessionData(updatedMessages, userText); 
    
    setInputText('');
    setLoading(true); 
    setInputLocked(true);
    Keyboard.dismiss();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // 🔥 KRİTİK DÜZELTME: Süreyi 60 saniyeye çıkarttık! Erken kapanıp hata vermeyecek.
      const askYoldas = functions().httpsCallable('askYoldas', { timeout: 60000 });
      
      const result = await askYoldas({ message: userText });

      if (abortController.signal.aborted) return;

      const botResponse = result?.data?.answer || "Sözcükleri toparlayamadım cancağızım, sorunu tekrar eder misin?"; 
      
      const botMsgObj = { id: (Date.now() + 1).toString(), text: botResponse, sender: 'bot', animate: true };
      const finalMessages = [...updatedMessages, botMsgObj];
      
      setMessages(finalMessages);
      updateSessionData(finalMessages); 

    } catch (e) {
      if (abortController.signal.aborted) return;
      
      console.log("Sistem Hatası:", e);
      // Hata mesajını biraz daha samimi ve anlaşılır yaptık
      const errMsgObj = { id: 'err_' + Date.now(), text: "😔 Şu an uzak diyarlara dalmışım cancağızım, bağlantım koptu. Sorunu tekrar eder misin?", sender: 'bot' };
      const errMessages = [...updatedMessages, errMsgObj];
      
      setMessages(errMessages);
      updateSessionData(errMessages);
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
        setInputLocked(false);
      }
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
            renderFormattedText(item.text, theme, isUser)
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
        
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity onPress={createNewChat} style={{padding: 8, marginRight: 5}}>
             <Plus size={24} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{padding: 8}}>
             <Menu size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView 
         style={{ flex: 1 }} 
         behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 20 }]}        
          ListFooterComponent={loading && <View style={styles.messageRow}><Image source={YOLDAS_AVATAR} style={styles.avatar} /><TypingIndicator theme={theme} /></View>}
        />

        <View style={[styles.inputArea, { 
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 10,
          marginBottom: Platform.OS === 'android' ? (keyboardHeight > 0 ? keyboardHeight : 10) : 0
        }]}>
          <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: theme.text, paddingLeft: 15 }]}
              placeholder={inputLocked ? "Yoldaş düşünüyor..." : "İçini dök derman arayalım..."}
              placeholderTextColor={theme.subText}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500} 
              editable={!inputLocked}
            />
            
            {inputLocked ? (
              <TouchableOpacity onPress={stopAction} style={[styles.sendBtn, { backgroundColor: '#F44336' }]}>
                <Square size={18} color="#FFF" fill="#FFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => sendMessage()} disabled={!inputText.trim()} style={[styles.sendBtn, { backgroundColor: theme.primary, opacity: !inputText.trim() ? 0.6 : 1 }]}>
                <Send size={20} color="#FFF" />
              </TouchableOpacity>
            )}

          </View>
          <Text style={{textAlign: 'right', fontSize: 10, color: theme.subText, marginRight: 10, marginTop: 4}}>
             {inputText.length}/500
          </Text>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={menuVisible} animationType="slide" transparent>
         <View style={styles.modalOverlay}>
            <View style={[styles.menuContent, { backgroundColor: theme.card }]}>
               <View style={styles.menuHeader}>
                  <Text style={[styles.menuTitle, { color: theme.text }]}>Sohbet Geçmişi</Text>
                  <TouchableOpacity onPress={() => setMenuVisible(false)} style={{padding: 5}}>
                    <X size={24} color={theme.subText} />
                  </TouchableOpacity>
               </View>

               <TouchableOpacity onPress={createNewChat} style={[styles.newChatBtn, { backgroundColor: theme.primary + '15' }]}>
                  <Plus size={20} color={theme.primary} />
                  <Text style={[styles.newChatText, { color: theme.primary }]}>Yeni Sohbet Başlat</Text>
               </TouchableOpacity>

               <FlatList 
                  data={sessions}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  renderItem={({item}) => {
                    const isActive = item.id === activeSessionId;
                    const dateObj = new Date(item.updatedAt);
                    const isToday = dateObj.toDateString() === new Date().toDateString();
                    const dateStr = isToday ? dateObj.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'}) : dateObj.toLocaleDateString('tr-TR', {day: 'numeric', month: 'short'});

                    return (
                      <TouchableOpacity 
                        onPress={() => switchSession(item.id)} 
                        style={[styles.sessionItem, { borderBottomColor: theme.border, backgroundColor: isActive ? (isDarkMode ? '#2C2C2E' : '#F5F5F5') : 'transparent' }]}
                      >
                        <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                          <MessageSquare size={20} color={isActive ? theme.primary : theme.subText} style={{marginRight: 12}} />
                          <View style={{flex: 1}}>
                            <Text style={[styles.sessionTitle, { color: isActive ? theme.primary : theme.text }]} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={{color: theme.subText, fontSize: 12, marginTop: 2}}>{dateStr}</Text>
                          </View>
                        </View>
                        
                        <TouchableOpacity onPress={() => deleteSession(item.id)} style={{padding: 8}}>
                          <Trash2 size={20} color="#FF3B30" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  }}
               />
            </View>
         </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, elevation: 3, zIndex: 10 },
  backBtn: { marginRight: 12 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  onlineRow: { flexDirection: 'row', alignItems: 'center' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 5 },
  onlineText: { fontSize: 12, fontWeight: '600' },
  
  listContent: { padding: 16 }, 
  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  bubble: { padding: 14, borderRadius: 20, maxWidth: '80%', elevation: 1, shadowOpacity: 0.05 },
  userBubble: { borderBottomRightRadius: 4 },
  botBubble: { borderBottomLeftRadius: 4 },
  messageText: { fontSize: 16, lineHeight: 24 },
  
  typingBubble: { padding: 12, borderRadius: 18, borderBottomLeftRadius: 4 },
  typingRow: { flexDirection: 'row', alignItems: 'center', height: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 2 },
  
  inputArea: { paddingHorizontal: 12, paddingTop: 5, backgroundColor: 'transparent' }, 
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 30, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5 },
  input: { flex: 1, maxHeight: 100, paddingVertical: 8, fontSize: 16 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  menuContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', minHeight: '50%', padding: 20 },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  menuTitle: { fontSize: 20, fontWeight: 'bold' },
  newChatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, marginBottom: 20 },
  newChatText: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  sessionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 12, borderBottomWidth: 1, borderRadius: 12, marginBottom: 4 },
  sessionTitle: { fontSize: 16, fontWeight: '600' }
});