import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, FlatList, 
  ActivityIndicator, TouchableOpacity, Platform, StatusBar, Dimensions 
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, MapPin, Moon, Star, Calendar } from 'lucide-react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext'; 

const { width } = Dimensions.get('window');
const CALENDAR_API_URL = process.env.EXPO_PUBLIC_CALENDAR_API_URL;

const TR_GUNLER = { "Sunday": "Pazar", "Monday": "Pazartesi", "Tuesday": "Salı", "Wednesday": "Çarşamba", "Thursday": "Perşembe", "Friday": "Cuma", "Saturday": "Cumartesi" };
const TR_AYLAR = { "January": "Ocak", "February": "Şubat", "March": "Mart", "April": "Nisan", "May": "Mayıs", "June": "Haziran", "July": "Temmuz", "August": "Ağustos", "September": "Eylül", "October": "Ekim", "November": "Kasım", "December": "Aralık" };
const TR_HICRI_AYLAR = { "Muharram": "Muharrem", "Safar": "Safer", "Rabi' al-awwal": "Rebiülevvel", "Rabi' al-thani": "Rebiülahir", "Jumada al-awwal": "Cemaziyelevvel", "Jumada al-thani": "Cemaziyelahir", "Rajab": "Recep", "Sha'ban": "Şaban", "Ramadan": "Ramazan", "Shawwal": "Şevval", "Dhu al-Qi'dah": "Zilkade", "Dhu al-Hijjah": "Zilhicce" };

// Önemli: Liste eleman yüksekliği sabitlenmeli (Crash koruması için)
const ITEM_HEIGHT = 165; 

export default function ImsakiyeScreen() {
  const { theme, isDarkMode } = useTheme();
  const navigation = useNavigation();
  const flatListRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [imsakiyeData, setImsakiyeData] = useState([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(-1);
  const [city, setCity] = useState("Konum...");
  const [hijriDateStr, setHijriDateStr] = useState("");
  const [countdown, setCountdown] = useState("--:--:--");
  const [nextVakitName, setNextVakitName] = useState("Vakit Hesaplanıyor...");

  useFocusEffect(
    useCallback(() => {
      fetchTwoMonthsData();
    }, [])
  );

  useEffect(() => {
    if (imsakiyeData.length > 0 && currentDayIndex !== -1) {
      calculateCountdown();
      const timer = setInterval(calculateCountdown, 1000);
      return () => clearInterval(timer);
    }
  }, [imsakiyeData, currentDayIndex]);

  const fetchTwoMonthsData = async () => {
    try {
      const useAutoLocationStr = await AsyncStorage.getItem('useAutoLocation');
      const userCity = await AsyncStorage.getItem('userCity');
      const useAutoLocation = useAutoLocationStr !== null ? JSON.parse(useAutoLocationStr) : true;

      const date = new Date();
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;

      const cacheKey = `imsakiye_cache_${year}_${month}`;
      const cachedStr = await AsyncStorage.getItem(cacheKey);

      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached.settingAuto === useAutoLocation && cached.settingCity === userCity) {
          processAndSetData(cached.rawList, cached.location);
          return;
        }
      }

      // 🔴 FALLBACK (Varsayılan) KOORDİNATLAR
      let lat = 41.0082, lon = 28.9784, displayName = "İstanbul"; 

      if (!useAutoLocation && userCity) {
        displayName = userCity;
        // 🔥 Manuel Şehir Arama (Zırhlı)
        try {
          let geocodeResult = await Location.geocodeAsync(userCity);
          if (geocodeResult.length > 0) {
            lat = geocodeResult[0].latitude;
            lon = geocodeResult[0].longitude;
          }
        } catch (geoError) {
          console.log("Geocode hatası (Emülatör kaynaklı olabilir), varsayılan konum kullanılacak.");
        }
      } else {
        // 🔥 Otomatik Konum Arama (Zırhlı)
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            let location = await Location.getCurrentPositionAsync({});
            lat = location.coords.latitude;
            lon = location.coords.longitude;
            let revGeocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
            if (revGeocode.length > 0) displayName = revGeocode[0].city || revGeocode[0].region || "Mevcut Konum";
          }
        } catch (gpsError) {
          console.log("GPS hatası (Emülatör kaynaklı olabilir), varsayılan konum kullanılacak.");
          displayName = "Konum Bulunamadı (İstanbul)";
        }
      }

      // API ÇAĞRISI
      const [res1, res2] = await Promise.all([
        axios.get(`${CALENDAR_API_URL}/${year}/${month}`, { params: { latitude: lat, longitude: lon, method: 13 } }),
        axios.get(`${CALENDAR_API_URL}/${nextYear}/${nextMonth}`, { params: { latitude: lat, longitude: lon, method: 13 } })
      ]);

      const rawList = [...res1.data.data, ...res2.data.data];
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ rawList, location: displayName, settingAuto: useAutoLocation, settingCity: userCity }));
      processAndSetData(rawList, displayName);

    } catch (error) {
      // 🔥 console.error YERİNE console.log KULLANDIK (Kırmızı ekran çıkmasın diye)
      console.log("Imsakiye API veya Genel Hata:", error.message);
      setLoading(false);
    }
  };

  const processAndSetData = (rawList, displayName) => {
    let processedList = [];
    let lastMonthTitle = "";

    rawList.forEach((item) => {
      const monthTitle = `${TR_AYLAR[item.date.gregorian.month.en] || item.date.gregorian.month.en} ${item.date.gregorian.year}`;
      if (monthTitle !== lastMonthTitle) {
        processedList.push({ type: 'month_header', title: monthTitle });
        lastMonthTitle = monthTitle;
      }
      processedList.push(item);
    });

    const finalList = [{ type: 'table_header' }, ...processedList];
    setImsakiyeData(finalList);
    setCity(displayName);
    
    const d = new Date();
    const todayStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    const todayData = rawList.find(d => d.date?.gregorian?.date === todayStr);
    
    if(todayData) setHijriDateStr(`${todayData.date.hijri.day} ${TR_HICRI_AYLAR[todayData.date.hijri.month.en] || todayData.date.hijri.month.en} ${todayData.date.hijri.year}`);

    const foundIndex = finalList.findIndex(d => d.date?.gregorian?.date === todayStr);
    setCurrentDayIndex(foundIndex);
    setLoading(false);

    // CRASH KORUMALI SCROLL
    if (foundIndex !== -1) {
        setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: foundIndex, animated: true, viewPosition: 0.2 });
        }, 500);
    }
  };

  const calculateCountdown = () => {
    // SIKI KONTROL (Undefined crash koruması)
    if (currentDayIndex === -1 || !imsakiyeData[currentDayIndex]?.timings) return;
    
    const todayData = imsakiyeData[currentDayIndex];
    const timings = todayData.timings;
    const now = new Date();
    const [d, m, y] = todayData.date.gregorian.date.split('-').map(Number);

    const parseTime = (timeStr) => {
      const [h, min] = timeStr.split(' ')[0].split(':').map(Number);
      return new Date(y, m - 1, d, h, min, 0);
    };

    const imsakTime = parseTime(timings.Fajr);
    const aksamTime = parseTime(timings.Maghrib);
    let targetTime, label;

    if (now < imsakTime) { targetTime = imsakTime; label = "Sahura Kalan"; }
    else if (now < aksamTime) { targetTime = aksamTime; label = "İftara Kalan"; }
    else {
      let nextIdx = currentDayIndex + 1;
      while (nextIdx < imsakiyeData.length && !imsakiyeData[nextIdx]?.timings) nextIdx++;
      if (imsakiyeData[nextIdx]) {
        const [nd, nm, ny] = imsakiyeData[nextIdx].date.gregorian.date.split('-').map(Number);
        const [nh, nmin] = imsakiyeData[nextIdx].timings.Fajr.split(' ')[0].split(':').map(Number);
        targetTime = new Date(ny, nm - 1, nd, nh, nmin, 0);
      } else { targetTime = new Date(imsakTime.getTime() + 86400000); }
      label = "Yarın Sahura";
    }

    const diff = targetTime - now;
    if (diff <= 0) { setCountdown("00:00:00"); return; }
    const h = Math.floor(diff / 3600000);
    const min = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    setCountdown(`${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    setNextVakitName(label);
  };

  const renderItem = ({ item, index }) => {
    if (item.type === 'table_header') return <View style={[styles.tableHeader, { backgroundColor: theme.background }]}><Text style={styles.colDateHeader}>GÜN</Text><Text style={styles.colTimeHeader}>İMSAK</Text><Text style={styles.colTimeHeader}>GÜNEŞ</Text><Text style={styles.colTimeHeader}>ÖĞLE</Text><Text style={styles.colTimeHeader}>İKND</Text><Text style={[styles.colTimeHeader, {fontWeight:'bold'}]}>İFTAR</Text><Text style={styles.colTimeHeader}>YATS</Text></View>;
    if (item.type === 'month_header') return <View style={styles.monthHeaderContainer}><Text style={[styles.monthHeaderText, { color: theme.primary }]}>{item.title}</Text><View style={[styles.monthHeaderLine, { backgroundColor: theme.border }]} /></View>;
    if (!item.timings) return null;

    const isToday = index === currentDayIndex;
    return (
      <View style={[styles.dayBlock, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF', borderColor: isToday ? theme.primary : (isDarkMode ? '#2C2C2E' : '#E5E5EA') }]}>
        <View style={styles.blockHeader}><Text style={[styles.gregorianText, { color: theme.text }]}>{`${item.date.gregorian.day} ${TR_AYLAR[item.date.gregorian.month.en] || item.date.gregorian.month.en}, ${TR_GUNLER[item.date.gregorian.weekday.en] || item.date.gregorian.weekday.en}`}</Text><Text style={[styles.hijriText, { color: theme.subText }]}>{`${item.date.hijri.day} ${TR_HICRI_AYLAR[item.date.hijri.month.en] || item.date.hijri.month.en}`}</Text></View>
        <View style={styles.timesRow}>
            {['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((v, i) => (
                <View key={i} style={{flex:1, alignItems:'center'}}>
                    <Text style={styles.timeLabel}>{['İmsak','Güneş','Öğle','İkindi','İftar','Yatsı'][i]}</Text>
                    <Text style={[styles.timeValue, { color: i === 4 ? theme.primary : theme.text, fontWeight: i === 4 ? 'bold' : '500' }]}>{item.timings[v].split(' ')[0]}</Text>
                </View>
            ))}
        </View>
        {isToday && <View style={[styles.todayIndicator, { backgroundColor: theme.primary }]} />}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }]}>
      <View style={styles.topBar}><TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={26} color={theme.text} /></TouchableOpacity><Text style={[styles.pageTitle, { color: theme.text }]}>İmsakiye</Text><View style={{width: 26}} /></View>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View> : 
        <FlatList
          ref={flatListRef}
          data={imsakiyeData}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          ListHeaderComponent={() => (
            <View style={styles.headerCardWrapper}>
              <View style={[styles.timerCard, { backgroundColor: theme.primary }]}>
                <View style={styles.cardTopRow}>
                  <View style={styles.badgeContainer}><MapPin size={12} color="#FFF" /><Text style={styles.badgeText}>{city}</Text></View>
                  <View style={styles.badgeContainer}><Moon size={10} color="#FFF" /><Text style={styles.badgeText}>{hijriDateStr}</Text></View>
                </View>
                <View style={styles.timerMain}><Text style={styles.timerLabel}>{nextVakitName}</Text><Text style={styles.timerValue}>{countdown}</Text></View>
                <Calendar size={120} color="rgba(255,255,255,0.08)" style={styles.bgIcon} />
              </View>
            </View>
          )}
          // CRASH ÖNLEYİCİ AYARLAR
          getItemLayout={(data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
          initialNumToRender={10}
          windowSize={5}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  pageTitle: { fontSize: 20, fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center' },
  headerCardWrapper: { paddingHorizontal: 16, marginBottom: 10 },
  timerCard: { padding: 16, borderRadius: 24, height: 160, justifyContent: 'space-between', overflow:'hidden' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '700', marginLeft: 4 },
  timerMain: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  timerLabel: { color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  timerValue: { color: '#FFF', fontSize: 38, fontWeight: '900' },
  bgIcon: { position: 'absolute', right: -20, bottom: -20 },
  tableHeader: { flexDirection: 'row', padding: 12, marginHorizontal: 16, borderRadius: 10, marginBottom: 5 },
  colDateHeader: { width: '20%', fontSize: 9, fontWeight: '800', opacity: 0.5 },
  colTimeHeader: { flex: 1, textAlign: 'center', fontSize: 9, fontWeight: '800', opacity: 0.5 },
  monthHeaderContainer: { padding: 20, flexDirection: 'row', alignItems: 'center' },
  monthHeaderText: { fontSize: 16, fontWeight: '800', marginRight: 10 },
  monthHeaderLine: { flex: 1, height: 1 },
  dayBlock: { marginHorizontal: 16, marginVertical: 6, padding: 15, borderRadius: 18, borderWidth: 1, height: 150 },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  gregorianText: { fontSize: 14, fontWeight: '700' },
  hijriText: { fontSize: 12 },
  timesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeLabel: { fontSize: 10, color: '#8E8E93', marginBottom: 4 },
  timeValue: { fontSize: 13 },
  todayIndicator: { position: 'absolute', left: 0, top: 20, bottom: 20, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 }
});