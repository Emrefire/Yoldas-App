import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, SafeAreaView, 
  TouchableOpacity, ActivityIndicator, Modal, 
  TextInput, KeyboardAvoidingView, Platform, 
  TouchableWithoutFeedback, Keyboard, StatusBar, Dimensions, Animated 
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { 
  CheckCircle2, Heart, Share2, MapPin, Plus, X, BookOpen, 
  Quote, Compass, Trash2, Star, MoonStar, Sparkles, Calendar 
} from 'lucide-react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import ViewShot from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDB, getAmeller, updateAmelStatus, addAmel, deleteAmel, addFavorite, removeFavorite, isFavorite } from '../database/db';
import { shareAsImage } from '../services/shareService';
import { registerForPushNotificationsAsync, scheduleAllPrayerNotifications, scheduleRamadanAlerts } from '../services/notificationService'; 
import { useTheme } from '../context/ThemeContext';
import { SURE_ISIMLERI, ESMA_TR_LIST, GUNLUK_HADISLER } from '../database/libraryData'; 

const { width } = Dimensions.get('window');

const EZAN_API_URL = process.env.EXPO_PUBLIC_EZAN_API_URL;
const KURAN_API_URL = process.env.EXPO_PUBLIC_KURAN_API_URL;

const MOTIVATION_MESSAGES = [
  "Harikasın! Bir adım daha ileri gittin. 🚀",
  "Maşallah! Gayretin takdire şayan. 🌟",
  "Zinciri kırma, aynen böyle devam et! 💪",
  "Allah gayretini arttırsın, süpersin! 🤲"
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const { theme, isDarkMode } = useTheme();
  
  const [tasks, setTasks] = useState([]);
  const [vakitler, setVakitler] = useState(null);
  const [hijriMonth, setHijriMonth] = useState(null);
  
  const lastVakitlerRef = useRef(null); 
  const lastScheduleTimeRef = useRef(0);
  
  const [hadis, setHadis] = useState({ content: "Yükleniyor...", source: "", id: "" });
  const [ayet, setAyet] = useState({ content: "Yükleniyor...", source: "", id: "" });
  const [esma, setEsma] = useState(null); 

  const [loading, setLoading] = useState(true);
  const [hadisLoading, setHadisLoading] = useState(true);
  const [ayetLoading, setAyetLoading] = useState(true);
  
  const [currentDateStr, setCurrentDateStr] = useState("");
  const [hijriDateStr, setHijriDateStr] = useState("");

  const [selectedMood, setSelectedMood] = useState(null);
  const [showAITooltip, setShowAITooltip] = useState(false);
  const tooltipFade = useRef(new Animated.Value(0)).current;

  const MOODS = [
    { id: 'sad', label: 'Hüzünlü', icon: '😔', content: "Üzülme, Allah bizimle beraberdir.", source: "Tevbe, 40" },
    { id: 'tired', label: 'Yorgun', icon: '😫', content: "Şüphesiz güçlükle beraber bir kolaylık vardır.", source: "İnşirah, 5" },
    { id: 'grateful', label: 'Şükürlü', icon: '🤲', content: "Eğer şükrederseniz, elbette size nimetimi artırırım.", source: "İbrahim, 7" },
    { id: 'anxious', label: 'Endişeli', icon: '😰', content: "Kalpler ancak Allah'ı anmakla huzur bulur.", source: "Ra'd, 28" },
    { id: 'sinful', label: 'Pişman', icon: '😢', content: "Allah, tövbe edenleri sever.", source: "Bakara, 222" },
  ];

  const [isHadisFav, setIsHadisFav] = useState(false);
  const [isAyetFav, setIsAyetFav] = useState(false);
  const [isEsmaFav, setIsEsmaFav] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [locationName, setLocationName] = useState('Yükleniyor...');
  const [timeLeft, setTimeLeft] = useState("");
  const [progress, setProgress] = useState(0);
  const [nextVakitName, setNextVakitName] = useState("");
  const [weeklyStreak, setWeeklyStreak] = useState([]); 
  const [streakCount, setStreakCount] = useState(0);

  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState("");

  const [prayerModalVisible, setPrayerModalVisible] = useState(false);
  const [currentPrayerTime, setCurrentPrayerTime] = useState(null);
  const lastFiredPrayerRef = useRef(null);

  const ayetRef = useRef();
  const hadisRef = useRef();
  const esmaRef = useRef();

  useEffect(() => {
    const checkTooltip = async () => {
      const hasSeen = await AsyncStorage.getItem('hasSeenAIIntro');
      if (!hasSeen) {
        setShowAITooltip(true);
        Animated.timing(tooltipFade, {
          toValue: 1, duration: 800, delay: 1500, useNativeDriver: true
        }).start();
      }
    };
    checkTooltip();
  }, []);

  const dismissTooltip = async () => {
    Haptics.selectionAsync();
    Animated.timing(tooltipFade, {
      toValue: 0, duration: 400, useNativeDriver: true
    }).start(async () => {
      setShowAITooltip(false);
      await AsyncStorage.setItem('hasSeenAIIntro', 'true');
    });
  };

  const getFormattedDate = () => {
    const date = new Date();
    const months = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
    const days = ["PAZAR", "PAZARTESİ", "SALI", "ÇARŞAMBA", "PERŞEMBE", "CUMA", "CUMARTESİ"];
    return `${date.getDate()} ${months[date.getMonth()]} ${days[date.getDay()]}`;
  };

  const getHijriDate = () => {
    try {
        return new Intl.DateTimeFormat('tr-TR-u-ca-islamic', {
            day: 'numeric', month: 'long', year: 'numeric'
        }).format(new Date());
    } catch (e) { return ""; }
  };

  const updateStreakData = async () => {
    try {
      const historyStr = await AsyncStorage.getItem('streak_history');
      let history = historyStr ? JSON.parse(historyStr) : {};
      const today = new Date().toISOString().split('T')[0];
      if (!history[today]) {
        history[today] = true;
        await AsyncStorage.setItem('streak_history', JSON.stringify(history));
      }
      const days = [];
      const todayObj = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(todayObj);
        d.setDate(todayObj.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        days.push({
          dayName: d.toLocaleDateString('tr-TR', { weekday: 'short' }).replace('.', ''),
          dayNumber: d.getDate(),
          fullDate: dateStr,
          isToday: i === 0,
          isCompleted: !!history[dateStr]
        });
      }
      setWeeklyStreak(days);
      setStreakCount(calculateCurrentStreak(days));
    } catch (error) { console.error(error); }
  };

  const calculateCurrentStreak = (days) => {
    let streak = 0;
    const reversedDays = days.slice().reverse();
    for (let day of reversedDays) { if (day.isCompleted) streak++; else break; }
    return streak;
  };

  useEffect(() => {
    initDB();
    registerForPushNotificationsAsync();
    fetchAyet();
    fetchHadis();
    fetchEsma(); 
    setCurrentDateStr(getFormattedDate());
    setHijriDateStr(getHijriDate());
  }, []);

  const getLocationAndVakitler = async () => {
    if (!vakitler) setLoading(true);

    try {
        const useAutoLocationStr = await AsyncStorage.getItem('useAutoLocation');
        const userCity = await AsyncStorage.getItem('userCity');
        const useAutoLocation = useAutoLocationStr !== null ? JSON.parse(useAutoLocationStr) : true;

        const todayStr = new Date().toDateString();
        const cachedStr = await AsyncStorage.getItem('cached_vakitler');
        
        if (cachedStr) {
            const cached = JSON.parse(cachedStr);
            if (
                cached.date === todayStr && 
                cached.settingAuto === useAutoLocation && 
                cached.settingCity === userCity
            ) {
                setVakitler(cached.timings);
                setHijriMonth(cached.hijri);
                setLocationName(cached.location);
                setLoading(false);
                return; 
            }
        }

        setLoading(true); 
        
        let queryLat, queryLon, displayName;

        if (!useAutoLocation && userCity) {
            displayName = userCity;
            let geocodeResult = await Location.geocodeAsync(userCity);
            if (geocodeResult.length > 0) {
                queryLat = geocodeResult[0].latitude;
                queryLon = geocodeResult[0].longitude;
            } else {
                queryLat = 41.0082; queryLon = 28.9784; 
                displayName = `${userCity} (?)`;
            }
        } else {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                displayName = 'İstanbul (İzin Yok)';
                queryLat = 41.0082; queryLon = 28.9784;
            } else {
                let location = await Location.getCurrentPositionAsync({});
                queryLat = location.coords.latitude;
                queryLon = location.coords.longitude;
                let rev = await Location.reverseGeocodeAsync({ latitude: queryLat, longitude: queryLon });
                if (rev.length > 0) displayName = rev[0].city || rev[0].region || "Konum";
                else displayName = "Mevcut Konum";
            }
        }
        
        const response = await axios.get(`${EZAN_API_URL}/timings`, { 
            params: { latitude: queryLat, longitude: queryLon, method: 13 } 
        });

        const fetchedTimings = response.data.data.timings;
        const fetchedHijri = response.data.data.date.hijri.month.number;
        
        setLocationName(displayName);
        setVakitler(fetchedTimings);
        setHijriMonth(fetchedHijri);
        setLoading(false);

        const cacheData = {
            timings: fetchedTimings,
            hijri: fetchedHijri,
            location: displayName,
            date: todayStr,
            settingAuto: useAutoLocation,
            settingCity: userCity
        };
        await AsyncStorage.setItem('cached_vakitler', JSON.stringify(cacheData));

    } catch (error) {
        try {
            const cachedStr = await AsyncStorage.getItem('cached_vakitler');
            if (cachedStr) {
                const cached = JSON.parse(cachedStr);
                setVakitler(cached.timings);
                setHijriMonth(cached.hijri);
                setLocationName(`${cached.location} (Çevrimdışı)`);
                setLoading(false);
                return; 
            }
        } catch (cacheError) {
            console.log("Cache okuma hatası:", cacheError);
        }

        setLoading(false);
        setLocationName("Bağlantı Yok");
    }
  };

  useFocusEffect(
    useCallback(() => {
      refreshTasks();
      updateStreakData();
      getLocationAndVakitler();
      if (ayet.id) setIsAyetFav(isFavorite(ayet.id));
      if (hadis.id) setIsHadisFav(isFavorite(hadis.id));
      if (esma) setIsEsmaFav(isFavorite(`esma-${esma.number}`));
    }, [ayet.id, hadis.id, esma?.number])
  );

  useEffect(() => {
    const checkAndSchedule = async () => {
      if (vakitler) {
        const now = Date.now();
        if (now - lastScheduleTimeRef.current < 2000) return;
        const currentHour = new Date().getHours();
        const uniqueKey = `v_final_v18_${currentHour}_${vakitler.Fajr}_${locationName}`;
        
        if (lastVakitlerRef.current !== uniqueKey) {
          await scheduleAllPrayerNotifications(vakitler); 
          await scheduleRamadanAlerts(vakitler); 
          lastVakitlerRef.current = uniqueKey;
          lastScheduleTimeRef.current = now; 
        }
      }
    };
    checkAndSchedule();
  }, [vakitler]);

  useEffect(() => {
    if (!vakitler) return;
    const calculateTime = () => {
      const now = new Date();
      const times = [
        { name: 'İmsak', time: vakitler.Fajr },
        { name: 'Güneş', time: vakitler.Sunrise },
        { name: 'Öğle', time: vakitler.Dhuhr },
        { name: 'İkindi', time: vakitler.Asr },
        { name: 'Akşam', time: vakitler.Maghrib },
        { name: 'Yatsı', time: vakitler.Isha }
      ];
      
      const mappedTimes = times.map(v => {
        const [h, m] = v.time.split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return { ...v, date: d };
      });
      mappedTimes.sort((a,b) => a.date - b.date);
      let nextIndex = mappedTimes.findIndex(v => v.date > now);
      let next, prev;

      if (nextIndex === -1) {
        next = { ...mappedTimes[0], date: new Date(mappedTimes[0].date.getTime() + 86400000) };
        prev = mappedTimes[mappedTimes.length - 1]; 
      } else if (nextIndex === 0) {
        next = mappedTimes[0];
        const lastPrayer = mappedTimes[mappedTimes.length - 1];
        prev = { ...lastPrayer, date: new Date(lastPrayer.date.getTime() - 86400000) };
      } else {
        next = mappedTimes[nextIndex];
        prev = mappedTimes[nextIndex - 1];
      }
      setNextVakitName(next.name);
      const diffMs = next.date - now;
      const diffSec = Math.floor(diffMs / 1000); 
      const h = Math.floor(diffSec / 3600);
      const m = Math.floor((diffSec % 3600) / 60);
      const s = diffSec % 60;
      setTimeLeft(`${h > 0 ? h + 'sa ' : ''}${m}dk ${s}sn`);
      
      const totalDuration = next.date - prev.date;
      const elapsed = now - prev.date;
      const percentage = totalDuration > 0 ? Math.max(0, Math.min(1, elapsed / totalDuration)) : 0;
      setProgress(percentage);

      if (diffSec <= 1 && diffSec >= 0) {
          if (lastFiredPrayerRef.current !== next.name) {
              let msg = "";
              switch(next.name) {
                  case 'İmsak': msg = "İmsak vakti girdi. Sabah namazı için hazırlık vakti."; break;
                  case 'Güneş': msg = "Güneş doğdu. Sabah namazı vakti sona erdi."; break;
                  case 'Öğle': msg = "Öğle namazı vakti! Haydi felaha, namaza."; break;
                  case 'İkindi': msg = "İkindi namazı vakti! Gündüzün koşturmacasına kısa bir ara ver."; break;
                  case 'Akşam': msg = "Akşam namazı vakti! Günün yorgunluğunu huzurla at."; break;
                  case 'Yatsı': msg = "Yatsı namazı vakti! Günü ibadetle taçlandır."; break;
              }
              setCurrentPrayerTime({ name: next.name, msg });
              setPrayerModalVisible(true);
              lastFiredPrayerRef.current = next.name;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
      }
    };
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [vakitler]);

  const fetchAyet = async () => {
    if (ayet.id === "") setAyetLoading(true); 
    try {
        const today = new Date().toDateString();
        const cachedStr = await AsyncStorage.getItem('daily_ayet');
        
        if (cachedStr) {
            const cached = JSON.parse(cachedStr);
            if (cached.date === today) {
                setAyet(cached.data);
                setIsAyetFav(isFavorite(cached.data.id));
                setAyetLoading(false);
                return;
            }
        }

        setAyetLoading(true); 
        const randomAyahNum = Math.floor(Math.random() * 6236) + 1;
        const response = await axios.get(`${KURAN_API_URL}/ayah/${randomAyahNum}/tr.diyanet?t=${Date.now()}`, { timeout: 6000 });
        const item = response.data.data;
        const sureNo = item.surah.number;
        const turkceSure = SURE_ISIMLERI.find(s => s.id === sureNo);
        const sureAdi = turkceSure ? turkceSure.name : item.surah.englishName;
        const ayetData = { content: item.text, source: `${sureAdi} Suresi, ${item.numberInSurah}. Ayet`, id: `ayah-${item.number}` };
        
        await AsyncStorage.setItem('daily_ayet', JSON.stringify({ date: today, data: ayetData }));
        
        setAyet(ayetData);
        setIsAyetFav(isFavorite(ayetData.id));
    } catch (error) { 
        setAyet({ content: "Rabbiniz şöyle buyurdu: Bana dua edin, duanıza icabet edeyim.", source: "Mü'min Suresi, 60. Ayet", id: "ayah-static" }); 
    } finally { 
        setAyetLoading(false); 
    }
  };

  const fetchHadis = async () => {
    if (hadis.id === "") setHadisLoading(true);
    try {
        const today = new Date().toDateString();
        const cachedStr = await AsyncStorage.getItem('daily_hadis');
        
        if (cachedStr) {
            const cached = JSON.parse(cachedStr);
            if (cached.date === today) {
                setHadis(cached.data);
                setIsHadisFav(isFavorite(cached.data.id));
                setHadisLoading(false);
                return;
            }
        }

        setHadisLoading(true);
        const pool = (GUNLUK_HADISLER && GUNLUK_HADISLER.length > 0) ? GUNLUK_HADISLER : [{ text: "Ameller niyetlere göredir.", source: "Buhari" }];
        const randomIndex = Math.floor(Math.random() * pool.length);
        const newHadis = pool[randomIndex];
        const localId = `hadith-local-${Date.now()}-${randomIndex}`; 
        const hadisData = { content: newHadis.text, source: newHadis.source, id: localId };

        await AsyncStorage.setItem('daily_hadis', JSON.stringify({ date: today, data: hadisData }));

        setHadis(hadisData);
        setIsHadisFav(isFavorite(localId));
    } catch (error) {
        console.log(error);
    } finally {
        setHadisLoading(false);
    }
  };

  const fetchEsma = async () => {
      try {
          const today = new Date().toDateString();
          const cachedStr = await AsyncStorage.getItem('daily_esma');
          
          if (cachedStr) {
              const cached = JSON.parse(cachedStr);
              if (cached.date === today) {
                  setEsma(cached.data);
                  setIsEsmaFav(isFavorite(`esma-${cached.data.number}`));
                  return;
              }
          }

          if (ESMA_TR_LIST && ESMA_TR_LIST.length > 0) {
             const randomIndex = Math.floor(Math.random() * ESMA_TR_LIST.length);
             const newEsma = ESMA_TR_LIST[randomIndex];
             
             await AsyncStorage.setItem('daily_esma', JSON.stringify({ date: today, data: newEsma }));
             
             setEsma(newEsma);
             setIsEsmaFav(isFavorite(`esma-${newEsma.number}`)); 
          } else {
             setEsma({ number: 1, name: "Allah", arabic: "الله", meaning: "Eşi benzeri olmayan tek İlah." });
          }
      } catch (error) {
          console.log(error);
      }
  };

  const toggleFavoriteItem = (item, type) => {
    let favId = item.id;
    if (type === 'esma') favId = `esma-${item.number}`;
    const isFav = isFavorite(favId);
    if (isFav) {
      removeFavorite(favId);
      if (type === 'ayet') setIsAyetFav(false);
      else if (type === 'hadis') setIsHadisFav(false);
      else if (type === 'esma') setIsEsmaFav(false);
    } else {
      let favData = { id: favId, number: 0 };
      if (type === 'ayet') favData = { ...favData, catId: '4', surahName: item.source || "Ayet", arabic: "", turkish: item.content };
      else if (type === 'hadis') favData = { ...favData, catId: 'hadis', surahName: item.source || "Hadis", arabic: "", turkish: item.content };
      else if (type === 'esma') favData = { ...favData, catId: 'esma', surahName: "Esmaül Hüsna", arabic: item.arabic, turkish: `${item.name} - ${item.meaning}` };
      addFavorite(favData);
      if (type === 'ayet') setIsAyetFav(true);
      else if (type === 'hadis') setIsHadisFav(true);
      else if (type === 'esma') setIsEsmaFav(true);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const refreshTasks = () => setTasks(getAmeller());
  const toggleTask = (id, cur) => { const newStatus = cur === 1 ? 0 : 1; updateAmelStatus(id, newStatus); refreshTasks(); if (newStatus === 1) { const randomMsg = MOTIVATION_MESSAGES[Math.floor(Math.random() * MOTIVATION_MESSAGES.length)]; setCelebrationMsg(randomMsg); setCelebrationVisible(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } else { Haptics.selectionAsync(); } };
  const handleSaveTask = () => { if (newTaskTitle.trim() === '') return; addAmel(newTaskTitle); setNewTaskTitle(''); setModalVisible(false); refreshTasks(); };
  const handleDeleteTask = (id) => { try { deleteAmel(id); refreshTasks(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch (e) { console.log("Silme hatası:", e); } };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 25) + 10 : 0 }]}>
      {showAITooltip && (
        <Animated.View style={[styles.tooltipContainer, { opacity: tooltipFade, backgroundColor: theme.primary }]}>
          <View style={styles.tooltipContent}>
            <View style={styles.tooltipHeader}><Sparkles size={18} color="#FFF" /><Text style={styles.tooltipTitle}>Selam, Ben Yoldaş! 🤖</Text></View>
            <Text style={styles.tooltipText}>Manevi konularda dertleşmek veya aklına takılanları sormak için her an yanındayım. Bana yukarıdaki parlayan butondan ulaşabilirsin! ✨</Text>
            <TouchableOpacity onPress={dismissTooltip} style={styles.tooltipButton}><Text style={[styles.tooltipButtonText, { color: theme.primary }]}>Anladım</Text></TouchableOpacity>
          </View>
          <View style={[styles.tooltipArrow, { borderBottomColor: theme.primary }]} />
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
           <View>
              <Text style={[styles.dateText, { color: theme.subText }]}>{currentDateStr}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary, marginTop: 2 }}>{hijriDateStr}</Text>
           </View>
           <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5}}>
              <Text style={[styles.welcomeText, { color: theme.text, flex: 1 }]}>Selamün Aleyküm, Yoldaş</Text>
           </View>
        </View>

        {/* MOOD */}
        <View style={styles.moodSection}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 5, marginBottom: 10, fontSize: 16 }]}>Bugün Halin Nasıl?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodList} contentContainerStyle={{ paddingRight: 20 }}>
            {MOODS.map((mood) => (
              <TouchableOpacity key={mood.id} style={[styles.moodItem, { backgroundColor: theme.card, borderColor: theme.border }, selectedMood?.id === mood.id && { borderColor: theme.primary, backgroundColor: theme.primary + '15' }]} onPress={() => { if (selectedMood?.id === mood.id) setSelectedMood(null); else { setSelectedMood(mood); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } }}>
                <Text style={styles.moodIcon}>{mood.icon}</Text>
                <Text style={[styles.moodText, { color: theme.text }]}>{mood.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {selectedMood && (
            <View style={[styles.prescriptionCard, { backgroundColor: isDarkMode ? '#1A2F1A' : '#F1F8E9', borderColor: theme.primary }]}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Text style={[styles.prescriptionTitle, { color: theme.primary }]}>Yoldaşın Diyor ki:</Text>
                    <TouchableOpacity onPress={() => setSelectedMood(null)}><X size={18} color={theme.subText} /></TouchableOpacity>
                </View>
                <Text style={[styles.prescriptionText, { color: theme.text }]}>"{selectedMood.content}"</Text>
                <Text style={[styles.prescriptionSource, { color: theme.primary }]}>{selectedMood.source}</Text>
            </View>
          )}
        </View>

        {/* STREAK */}
        <View style={styles.streakSection}>
           <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 16, marginBottom: 0 }]}>İstikrar Tablon</Text>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <Text style={{fontSize: 12, color: theme.primary, fontWeight: 'bold'}}>{streakCount} Günlük Seri 🔥</Text>
              </View>
           </View>
           <View style={[styles.streakContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {weeklyStreak.map((day, index) => (
                <View key={index} style={styles.dayColumn}>
                  <Text style={[styles.dayName, { color: day.isToday ? theme.primary : theme.subText }]}>{day.dayName}</Text>
                  <View style={[styles.streakCircle, { backgroundColor: day.isCompleted ? theme.primary : (isDarkMode ? '#333' : '#E0E0E0'), borderColor: day.isToday ? theme.primary : 'transparent', borderWidth: day.isToday ? 2 : 0 }]}>
                    {day.isCompleted && <CheckCircle2 size={14} color="#FFF" />}
                  </View>
                  <Text style={[styles.dayNumber, { color: theme.text, opacity: day.isToday ? 1 : 0.6 }]}>{day.dayNumber}</Text>
                </View>
              ))}
           </View>
        </View>

        {/* VAKİTLER KARTI */}
        <View style={[styles.vakitCard, { backgroundColor: theme.card }]}>
          <View style={styles.newLocationHeader}>
             <MapPin size={18} color={theme.primary} />
             <Text style={[styles.newLocationText, { color: theme.text }]}>{locationName}</Text>
          </View>

          {/* ARAÇLAR SATIRI */}
          <View style={styles.newToolsRow}>
              {/* CAMİLER */}
              <TouchableOpacity style={[styles.newToolBtn, { backgroundColor: isDarkMode ? theme.iconBg : '#F5F5F5', flex: 1, marginRight: 6 }]} onPress={() => navigation.navigate('Mosque')}>
                  <MoonStar size={18} color={theme.primary} />
                  <Text style={[styles.newToolText, { color: theme.primary, fontSize: 13 }]}>Camiler</Text>
              </TouchableOpacity>
              
              {/* İMSAKİYE */}
              <TouchableOpacity style={[styles.newToolBtn, { backgroundColor: isDarkMode ? theme.iconBg : '#F5F5F5', flex: 1, marginHorizontal: 3 }]} onPress={() => navigation.navigate('Imsakiye')}>
                  <Calendar size={18} color={theme.primary} />
                  <Text style={[styles.newToolText, { color: theme.primary, fontSize: 13 }]}>İmsakiye</Text>
              </TouchableOpacity>

              {/* KIBLE */}
              <TouchableOpacity style={[styles.newToolBtn, { backgroundColor: isDarkMode ? theme.iconBg : '#F5F5F5', flex: 1, marginLeft: 6 }]} onPress={() => navigation.navigate('Qibla')}>
                  <Compass size={18} color={theme.primary} />
                  <Text style={[styles.newToolText, { color: theme.primary, fontSize: 13 }]}>Kıble</Text>
              </TouchableOpacity>
          </View>

          {!loading && vakitler && (
            <View style={styles.timerWrapper}>
               <Text style={[styles.nextVakitLabel, { color: theme.subText }]}>{nextVakitName} vaktine kalan süre:</Text>
               <Text style={[styles.timerText, { color: theme.text }]}>{timeLeft}</Text>
               <View style={[styles.progressBarBg, { backgroundColor: isDarkMode ? '#2C2C2E' : '#E8F5E9' }]}>
                  <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: theme.primary }]} />
               </View>
            </View>
          )}
          {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} /> : (
            <View style={styles.vakitGrid}>
              <VakitBox ad="İmsak" saat={vakitler?.Fajr} theme={theme} />
              <VakitBox ad="Öğle" saat={vakitler?.Dhuhr} theme={theme} />
              <VakitBox ad="İkindi" saat={vakitler?.Asr} theme={theme} />
              <VakitBox ad="Akşam" saat={vakitler?.Maghrib} theme={theme} />
              <VakitBox ad="Yatsı" saat={vakitler?.Isha} theme={theme} />
            </View>
          )}
        </View>

        {/* AYET KARTI */}
        <View style={styles.shareableWrapper}>
          <ViewShot ref={ayetRef} options={{ format: 'png', quality: 0.9 }} style={[styles.mainCard, { backgroundColor: isDarkMode ? '#1C3D1A' : '#3A6B35' }]}>
            <View style={styles.cardHeader}><View style={styles.tagContainer}><BookOpen size={16} color="#FFF" /><Text style={[styles.tagText, { color: '#FFF' }]}>{ayet.source}</Text></View></View>
            {ayetLoading ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.quoteText, { color: '#FFF' }]}>"{ayet.content}"</Text>}
            <Text style={[styles.watermark, { color: '#FFF', opacity: 0.6 }]}>Yoldaş Uygulaması</Text>
          </ViewShot>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => toggleFavoriteItem(ayet, 'ayet')}><Heart size={22} color={isAyetFav ? "#E74C3C" : theme.subText} fill={isAyetFav ? "#E74C3C" : "transparent"} /></TouchableOpacity>
            <TouchableOpacity onPress={() => shareAsImage(ayetRef)} style={styles.actionIcon}><Share2 size={22} color={theme.primary} /></TouchableOpacity>
          </View>
        </View>

        {/* ESMA KARTI */}
        {esma && (
            <View style={styles.shareableWrapper}>
              <ViewShot ref={esmaRef} options={{ format: 'png', quality: 0.9 }} style={[styles.mainCard, { backgroundColor: isDarkMode ? '#4A148C' : '#7B1FA2' }]}>
                <View style={styles.cardHeader}>
                    <View style={styles.tagContainer}><Star size={16} color="#FFF" /><Text style={[styles.tagText, { color: '#FFF' }]}>Günün Esması</Text></View>
                </View>
                <Text style={{ color: '#FFF', fontSize: 32, textAlign: 'center', marginBottom: 5, fontWeight: 'bold' }}>{esma.arabic || ""}</Text>
                <Text style={[styles.quoteText, { color: '#FFF', fontSize: 22, textAlign: 'center', marginBottom: 5 }]}>{esma.name}</Text>
                <Text style={[styles.tagText, { color: '#FFF', textAlign: 'center', fontStyle: 'italic', opacity: 0.9, fontSize: 16 }]}>"{esma.meaning}"</Text>
                <Text style={[styles.watermark, { color: '#FFF', opacity: 0.6 }]}>Yoldaş Uygulaması</Text>
              </ViewShot>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => toggleFavoriteItem(esma, 'esma')}><Heart size={22} color={isEsmaFav ? "#E74C3C" : theme.subText} fill={isEsmaFav ? "#E74C3C" : "transparent"} /></TouchableOpacity>
                <TouchableOpacity onPress={() => shareAsImage(esmaRef)} style={styles.actionIcon}><Share2 size={22} color={theme.primary} /></TouchableOpacity>
              </View>
            </View>
        )}

        {/* HADİS KARTI */}
        <View style={styles.shareableWrapper}>
          <ViewShot ref={hadisRef} options={{ format: 'png', quality: 0.9 }} style={[styles.mainCard, { backgroundColor: isDarkMode ? '#1A3317' : '#2D5A27' }]}>
            <View style={styles.cardHeader}><View style={styles.tagContainer}><Quote size={16} color="#FFF" /><Text style={[styles.tagText, { color: '#FFF' }]}>Günün Hadisi</Text></View></View>
            {hadisLoading ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.quoteText, { color: '#FFF' }]}>"{hadis.content}"</Text>}
            <Text style={[styles.tagText, { marginTop: 10, opacity: 0.8, color: '#FFF' }]}>{hadis.source}</Text>
            <Text style={[styles.watermark, { color: '#FFF', opacity: 0.6 }]}>Yoldaş Uygulaması</Text>
          </ViewShot>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => toggleFavoriteItem(hadis, 'hadis')}><Heart size={22} color={isHadisFav ? "#E74C3C" : theme.subText} fill={isHadisFav ? "#E74C3C" : "transparent"} /></TouchableOpacity>
            <TouchableOpacity onPress={() => shareAsImage(hadisRef)} style={styles.actionIcon}><Share2 size={22} color={theme.primary} /></TouchableOpacity>
          </View>
        </View>

        {/* HEDEFLER */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Bugünkü Hedeflerin</Text>
              <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.addButton, { backgroundColor: isDarkMode ? theme.iconBg : '#E8F5E9' }]}><Plus size={20} color={theme.primary} /></TouchableOpacity>
          </View>
          {tasks.map(task => (
            <View key={task.id} style={[styles.taskRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
               <TouchableOpacity style={styles.taskClickable} onPress={() => toggleTask(task.id, task.tamamlandi)}>
                  <CheckCircle2 size={22} color={task.tamamlandi === 1 ? theme.primary : theme.subText} />
                  <Text style={[styles.taskText, { color: theme.text }, task.tamamlandi === 1 && styles.taskTextDone]}>{task.baslik}</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteTask(task.id)}>
                  <Trash2 size={20} color={theme.subText} />
               </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* MODALLAR */}
      <Modal animationType="fade" transparent visible={prayerModalVisible}>
         <View style={styles.celebrationOverlay}>
             <View style={[styles.celebrationCard, { backgroundColor: theme.card, borderColor: theme.primary, borderWidth: 2 }]}>
                <Text style={{fontSize: 50, marginBottom: 15}}>🕌</Text>
                <Text style={[styles.celebrationTitle, { color: theme.primary, textAlign: 'center' }]}>{currentPrayerTime?.name} Vakti!</Text>
                <Text style={[styles.celebrationText, { color: theme.text, fontSize: 18, marginVertical: 15, textAlign: 'center' }]}>{currentPrayerTime?.msg}</Text>
                <TouchableOpacity style={[styles.celebrationButton, { backgroundColor: theme.primary, width: '80%' }]} onPress={() => setPrayerModalVisible(false)}>
                    <Text style={[styles.celebrationButtonText, { textAlign: 'center' }]}>Allah Kabul Etsin</Text>
                </TouchableOpacity>
             </View>
         </View>
      </Modal>

      {/* 🔥 HEDEF EKLEME MODALI KLAVYE DÜZELTMESİ EKLENDİ */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : undefined} 
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Yeni Hedef Ekle</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}><X size={24} color={theme.subText} /></TouchableOpacity>
                </View>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} 
                  placeholder="Hedef başlığını yazın..." 
                  placeholderTextColor={theme.subText} 
                  value={newTaskTitle} 
                  onChangeText={setNewTaskTitle} 
                  autoFocus={true} 
                />
                <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleSaveTask}>
                  <Text style={styles.saveButtonText}>Listeye Ekle</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="fade" transparent visible={celebrationVisible}>
         <View style={styles.celebrationOverlay}>
             <View style={[styles.celebrationCard, { backgroundColor: theme.card, borderColor: theme.primary }]}>
                <Text style={{fontSize: 50, marginBottom: 10}}>🎉</Text>
                <Text style={[styles.celebrationTitle, { color: theme.primary }]}>Tebrikler!</Text>
                <Text style={[styles.celebrationText, { color: theme.text }]}>{celebrationMsg}</Text>
                <TouchableOpacity style={[styles.celebrationButton, { backgroundColor: theme.primary }]} onPress={() => setCelebrationVisible(false)}>
                    <Text style={styles.celebrationButtonText}>Harika!</Text>
                </TouchableOpacity>
             </View>
         </View>
      </Modal>
    </SafeAreaView>
  );
}

const VakitBox = ({ ad, saat, theme }) => (
  <View style={styles.vakitBox}><Text style={[styles.vakitAd, { color: theme.subText }]}>{ad}</Text><Text style={[styles.vakitSaat, { color: theme.text }]}>{saat}</Text></View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  header: { marginTop: 20, marginBottom: 25 },
  dateText: { fontSize: 14, fontWeight: '500', textTransform: 'uppercase' },
  welcomeText: { fontSize: 26, fontWeight: 'bold', marginTop: 4 },
  
  // Tooltip
  tooltipContainer: { position: 'absolute', top: Platform.OS === 'ios' ? 100 : 80, right: 20, width: width * 0.7, borderRadius: 20, padding: 15, zIndex: 10000, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 10 },
  tooltipContent: { alignItems: 'flex-start' },
  tooltipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tooltipTitle: { color: '#FFF', fontWeight: '800', marginLeft: 8, fontSize: 15 },
  tooltipText: { color: '#FFF', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  tooltipButton: { marginTop: 15, backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-end' },
  tooltipButtonText: { fontWeight: '800', fontSize: 13 },
  tooltipArrow: { position: 'absolute', top: -10, right: 15, width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent' },

  moodSection: { marginBottom: 25 },
  moodList: { flexDirection: 'row' },
  moodItem: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, marginRight: 10, borderWidth: 1, minWidth: 85 },
  moodIcon: { fontSize: 24, marginBottom: 5 },
  moodText: { fontSize: 12, fontWeight: '600' },
  prescriptionCard: { marginTop: 15, padding: 15, borderRadius: 16, borderWidth: 1, borderLeftWidth: 5 },
  prescriptionTitle: { fontWeight: 'bold', fontSize: 13, marginBottom: 8, textTransform: 'uppercase', opacity: 0.8 },
  prescriptionText: { fontSize: 16, fontStyle: 'italic', lineHeight: 24, marginBottom: 8, fontWeight: '500' },
  prescriptionSource: { fontSize: 12, fontWeight: 'bold', textAlign: 'right' },

  streakSection: { marginBottom: 25 },
  streakContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderRadius: 20, borderWidth: 1 },
  dayColumn: { alignItems: 'center', flex: 1 },
  dayName: { fontSize: 11, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase' },
  streakCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  dayNumber: { fontSize: 12, fontWeight: 'bold' },

  vakitCard: { borderRadius: 20, padding: 18, marginBottom: 25, elevation: 2 },
  newLocationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  newLocationText: { fontSize: 16, fontWeight: 'bold', marginLeft: 8, textAlign: 'center' },
  
  newToolsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  newToolBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
  newToolText: { fontSize: 14, fontWeight: 'bold', marginLeft: 6 },

  timerWrapper: { alignItems: 'center', marginBottom: 20, paddingBottom: 10 },
  nextVakitLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  timerText: { fontSize: 28, fontWeight: 'bold', marginBottom: 12, fontVariant: ['tabular-nums'] },
  progressBarBg: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  vakitGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  vakitBox: { alignItems: 'center' },
  vakitAd: { fontSize: 11, marginBottom: 4, fontWeight: '600' },
  vakitSaat: { fontSize: 13, fontWeight: 'bold' },

  shareableWrapper: { marginBottom: 25 },
  mainCard: { borderRadius: 24, padding: 24, elevation: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  tagContainer: { flexDirection: 'row', alignItems: 'center' },
  tagText: { fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
  quoteText: { fontSize: 18, fontWeight: '600', lineHeight: 28 },
  watermark: { marginTop: 15, fontSize: 10, textAlign: 'center', fontWeight: 'bold' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, paddingRight: 10 },
  actionIcon: { marginLeft: 20 },

  section: { marginTop: 10, marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  addButton: { padding: 5, borderRadius: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
  taskClickable: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  deleteButton: { padding: 5 },
  taskText: { marginLeft: 12, fontSize: 16, fontWeight: '500' },
  taskTextDone: { textDecorationLine: 'line-through', opacity: 0.6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  input: { padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 20 },
  saveButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  celebrationOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  celebrationCard: { width: '80%', padding: 25, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
  celebrationTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  celebrationText: { fontSize: 16, textAlign: 'center', marginBottom: 20, lineHeight: 22, fontWeight: '500' },
  celebrationButton: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
  celebrationButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});