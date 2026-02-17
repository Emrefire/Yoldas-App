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
const CALENDAR_API_URL = "https://api.aladhan.com/v1/calendar";

// --- GARANTİLİ TÜRKÇE GÜN/AY SÖZLÜĞÜ ---
const TR_GUNLER = {
  "Sunday": "Pazar", "Monday": "Pazartesi", "Tuesday": "Salı", "Wednesday": "Çarşamba",
  "Thursday": "Perşembe", "Friday": "Cuma", "Saturday": "Cumartesi"
};

const TR_AYLAR = {
  "January": "Ocak", "February": "Şubat", "March": "Mart", "April": "Nisan", "May": "Mayıs", "June": "Haziran",
  "July": "Temmuz", "August": "Ağustos", "September": "Eylül", "October": "Ekim", "November": "Kasım", "December": "Aralık"
};

// 🔥 SÜPER HİCRİ SÖZLÜK (Tüm varyasyonları yakalar)
const TR_HICRI_AYLAR = {
  // Muharrem
  "Muharram": "Muharrem", "al-Muḥarram": "Muharrem",
  // Safer
  "Safar": "Safer", 
  // Rebiülevvel
  "Rabi' al-awwal": "Rebiülevvel", "Rabi' al-Awwal": "Rebiülevvel", "Rabī‘ al-awwal": "Rebiülevvel",
  // Rebiülahir
  "Rabi' al-thani": "Rebiülahir", "Rabi' al-Thani": "Rebiülahir", "Rabī‘ al-thānī": "Rebiülahir",
  // Cemaziyelevvel
  "Jumada al-awwal": "Cemaziyelevvel", "Jumādā al-ūlā": "Cemaziyelevvel",
  // Cemaziyelahir
  "Jumada al-thani": "Cemaziyelahir", "Jumādā al-ākhirah": "Cemaziyelahir",
  // Recep
  "Rajab": "Recep",
  // Şaban (Burası kritik)
  "Sha'ban": "Şaban", "Shaban": "Şaban", "Sha‘bān": "Şaban","Sha’bān": "Şaban",
  // Ramazan
  "Ramadan": "Ramazan", "Ramadhan": "Ramazan", "Ramaḍān": "Ramazan",
  // Şevval
  "Shawwal": "Şevval", "Shawwāl": "Şevval",
  // Zilkade
  "Dhu al-Qi'dah": "Zilkade", "Dhul Qadah": "Zilkade", "Dhū al-Qa‘dah": "Zilkade",
  // Zilhicce
  "Dhu al-Hijjah": "Zilhicce", "Dhul Hijjah": "Zilhicce", "Dhū al-Ḥijjah": "Zilhicce"
};

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
  const [nextVakitName, setNextVakitName] = useState("Vakit Hesaplanıyor");

  useFocusEffect(
    useCallback(() => {
      fetchTwoMonthsData();
    }, [])
  );

  useEffect(() => {
    if (imsakiyeData.length > 0) {
      const timer = setInterval(calculateCountdown, 1000);
      return () => clearInterval(timer);
    }
  }, [imsakiyeData]);

  const fetchTwoMonthsData = async () => {
    setLoading(true);
    try {
      const useAutoLocationStr = await AsyncStorage.getItem('useAutoLocation');
      const userCity = await AsyncStorage.getItem('userCity');
      const useAutoLocation = useAutoLocationStr !== null ? JSON.parse(useAutoLocationStr) : true;

      let lat = 41.0082, lon = 28.9784; 

      if (!useAutoLocation && userCity) {
         setCity(userCity);
         let geocodeResult = await Location.geocodeAsync(userCity);
         if (geocodeResult.length > 0) {
             lat = geocodeResult[0].latitude;
             lon = geocodeResult[0].longitude;
         }
      } else {
         let { status } = await Location.requestForegroundPermissionsAsync();
         if (status === 'granted') {
            let location = await Location.getCurrentPositionAsync({});
            lat = location.coords.latitude;
            lon = location.coords.longitude;
            let reverseGeocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
            if (reverseGeocode.length > 0) {
              setCity(reverseGeocode[0].city || reverseGeocode[0].region || "Konum");
            }
         } else { setCity("İstanbul"); }
      }

      const date = new Date();
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;

      const [res1, res2] = await Promise.all([
        axios.get(`${CALENDAR_API_URL}/${year}/${month}`, { params: { latitude: lat, longitude: lon, method: 13 } }),
        axios.get(`${CALENDAR_API_URL}/${nextYear}/${nextMonth}`, { params: { latitude: lat, longitude: lon, method: 13 } })
      ]);

      const rawList = [...res1.data.data, ...res2.data.data];
      
      let processedList = [];
      let lastMonthTitle = "";

      rawList.forEach((item) => {
          const engMonth = item.date.gregorian.month.en;
          const trMonth = TR_AYLAR[engMonth] || engMonth;
          const yearVal = item.date.gregorian.year;
          const monthTitle = `${trMonth} ${yearVal}`;

          if (monthTitle !== lastMonthTitle) {
              processedList.push({ type: 'month_header', title: monthTitle });
              lastMonthTitle = monthTitle;
          }
          processedList.push(item);
      });

      const finalList = [{ type: 'table_header' }, ...processedList];
      setImsakiyeData(finalList);
      
      const todayStr = formatDateForMatch(new Date());
      const todayData = rawList.find(d => d.date.gregorian.date === todayStr);
      if(todayData) {
        const hMonthEng = todayData.date.hijri.month.en;
        // 🔥 Gelişmiş sözlükten kontrol et, bulamazsan orijinalini koy
        const hMonthTr = TR_HICRI_AYLAR[hMonthEng] || hMonthEng; 
        setHijriDateStr(`${todayData.date.hijri.day} ${hMonthTr} ${todayData.date.hijri.year}`);
      }

      const foundIndex = finalList.findIndex(d => d.date && d.date.gregorian.date === todayStr);
      setCurrentDayIndex(foundIndex);
      setLoading(false);

      setTimeout(() => {
        if (flatListRef.current && foundIndex !== -1) {
          flatListRef.current.scrollToIndex({ index: foundIndex, animated: true, viewPosition: 0.15 });
        }
      }, 600);

    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const formatDateForMatch = (date) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const calculateCountdown = () => {
    if (currentDayIndex === -1 || !imsakiyeData[currentDayIndex]) return;
    
    const todayData = imsakiyeData[currentDayIndex];
    if (!todayData.timings) return; 

    const timings = todayData.timings;
    const now = new Date();
    
    const dateParts = todayData.date.gregorian.date.split('-');
    const parseTime = (timeStr) => {
      const [h, m] = timeStr.split(' ')[0].split(':');
      const d = new Date(parseInt(dateParts[2]), parseInt(dateParts[1])-1, parseInt(dateParts[0]));
      d.setHours(parseInt(h), parseInt(m), 0);
      return d;
    };

    const imsakTime = parseTime(timings.Fajr);
    const aksamTime = parseTime(timings.Maghrib);
    let targetTime, label;

    if (now < imsakTime) {
      targetTime = imsakTime; label = "Sahura Kalan";
    } else if (now < aksamTime) {
      targetTime = aksamTime; label = "İftara Kalan";
    } else {
      let nextIndex = currentDayIndex + 1;
      while (nextIndex < imsakiyeData.length && !imsakiyeData[nextIndex].timings) {
          nextIndex++;
      }

      if (imsakiyeData[nextIndex] && imsakiyeData[nextIndex].timings) {
         const nextParts = imsakiyeData[nextIndex].date.gregorian.date.split('-');
         const dNext = new Date(parseInt(nextParts[2]), parseInt(nextParts[1])-1, parseInt(nextParts[0]));
         const [h, m] = imsakiyeData[nextIndex].timings.Fajr.split(' ')[0].split(':');
         dNext.setHours(parseInt(h), parseInt(m), 0);
         targetTime = dNext;
      } else {
         targetTime = new Date(imsakTime); targetTime.setDate(targetTime.getDate() + 1);
      }
      label = "Yarın Sahura";
    }

    const diff = targetTime - now;
    if (diff < 0) return;
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    setCountdown(`${h}sa ${m}dk ${s}sn`);
    setNextVakitName(label);
  };

  const renderHeader = () => (
    <View style={styles.headerCardWrapper}>
      <View style={[styles.timerCard, { backgroundColor: theme.primary }]}>
        <View style={styles.cardTopRow}>
           <View style={styles.badgeContainer}>
              <MapPin size={12} color="#FFF" style={{marginRight:4}} />
              <Text style={styles.badgeText} numberOfLines={1}>{city}</Text>
           </View>
           <View style={[styles.badgeContainer, { backgroundColor: 'rgba(0,0,0,0.15)' }]}>
              <Moon size={10} color="#FFF" style={{marginRight:4}} />
              <Text style={styles.badgeText}>{hijriDateStr || "Hicri Takvim"}</Text>
           </View>
        </View>

        <View style={styles.timerMain}>
           <Text style={styles.timerLabel}>{nextVakitName}</Text>
           <Text style={styles.timerValue}>{countdown}</Text>
        </View>

        <Calendar size={120} color="rgba(255,255,255,0.08)" style={styles.bgIcon} />
      </View>
    </View>
  );

  const renderItem = ({ item, index }) => {
    if (item.type === 'table_header') return (
        <View style={[styles.tableHeader, { backgroundColor: theme.background }]}> 
          <Text style={[styles.colDateHeader, { color: theme.subText }]}>GÜN</Text>
          <Text style={[styles.colTimeHeader, { color: theme.text, fontWeight:'bold' }]}>İMSAK</Text>
          <Text style={[styles.colTimeHeader, { color: theme.subText }]}>GÜN</Text>
          <Text style={[styles.colTimeHeader, { color: theme.subText }]}>ÖĞLE</Text>
          <Text style={[styles.colTimeHeader, { color: theme.subText }]}>İKND</Text>
          <Text style={[styles.colTimeHeader, { color: theme.text, fontWeight:'bold' }]}>İFTAR</Text>
          <Text style={[styles.colTimeHeader, { color: theme.subText }]}>YATS</Text>
        </View>
    );

    if (item.type === 'month_header') return (
        <View style={styles.monthHeaderContainer}>
            <Text style={[styles.monthHeaderText, { color: theme.primary }]}>{item.title}</Text>
            <View style={[styles.monthHeaderLine, { backgroundColor: theme.border }]} />
        </View>
    );

    if (!item.date || !item.timings) return null;

    const isToday = index === currentDayIndex;
    const isKadirGecesi = item.date.hijri.month.number === 9 && item.date.hijri.day === '27';
    
    // Gün ve Ay İsimleri
    const engDayName = item.date.gregorian.weekday.en;
    const engMonthName = item.date.gregorian.month.en;
    const trDayName = TR_GUNLER[engDayName] || engDayName;
    const trMonthName = TR_AYLAR[engMonthName] || engMonthName;

    // 🔥 HİCRİ AY (Süper Sözlük Devrede)
    const engHijriMonth = item.date.hijri.month.en;
    const trHijriMonth = TR_HICRI_AYLAR[engHijriMonth] || engHijriMonth;

    const gregorianDate = `${item.date.gregorian.day} ${trMonthName}, ${trDayName}`;
    const hijriDate = `${item.date.hijri.day} ${trHijriMonth} ${item.date.hijri.year}`;

    return (
      <View style={[
        styles.dayBlock, 
        { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF', borderColor: isToday ? theme.primary : (isDarkMode ? '#2C2C2E' : '#E5E5EA') }
      ]}>
        <View style={styles.blockHeader}>
           <Text style={[styles.gregorianText, { color: theme.text }]}>{gregorianDate}</Text>
           <Text style={[styles.hijriText, { color: theme.subText }]}>{hijriDate}</Text>
        </View>

        <View style={styles.timeLabelsRow}>
           <Text style={styles.timeLabel}>İmsak</Text>
           <Text style={styles.timeLabel}>Güneş</Text>
           <Text style={styles.timeLabel}>Öğle</Text>
           <Text style={styles.timeLabel}>İkindi</Text>
           <Text style={styles.timeLabel}>Akşam</Text>
           <Text style={styles.timeLabel}>Yatsı</Text>
        </View>

        <View style={styles.timesRow}>
           <Text style={[styles.timeValue, { color: theme.text }]}>{item.timings.Fajr.split(' ')[0]}</Text>
           <Text style={[styles.timeValue, { color: theme.text }]}>{item.timings.Sunrise.split(' ')[0]}</Text>
           <Text style={[styles.timeValue, { color: theme.text }]}>{item.timings.Dhuhr.split(' ')[0]}</Text>
           <Text style={[styles.timeValue, { color: theme.text }]}>{item.timings.Asr.split(' ')[0]}</Text>
           <Text style={[styles.timeValue, { color: theme.primary, fontWeight: 'bold' }]}>{item.timings.Maghrib.split(' ')[0]}</Text>
           <Text style={[styles.timeValue, { color: theme.text }]}>{item.timings.Isha.split(' ')[0]}</Text>
        </View>

        {isToday && <View style={[styles.todayIndicator, { backgroundColor: theme.primary }]} />}
        {isKadirGecesi && <Star size={16} color="#FFD700" fill="#FFD700" style={styles.starIcon} />}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: theme.text }]}>İmsakiye</Text>
        <View style={{width: 26}} /> 
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={imsakiyeData}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          stickyHeaderIndices={[0]} 
          contentContainerStyle={styles.listContent}
          onScrollToIndexFailed={info => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  pageTitle: { fontSize: 22, fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center' },
  listContent: { paddingBottom: 40 },

  // --- Header Card ---
  headerCardWrapper: { paddingHorizontal: 16, marginBottom: 10 },
  timerCard: { 
    padding: 16, borderRadius: 24, overflow: 'hidden', height: 160, 
    justifyContent: 'space-between', elevation: 8 
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 2 },
  
  badgeContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, maxWidth: '48%' 
  },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' }, 

  timerMain: { alignItems: 'center', justifyContent: 'center', flex: 1, zIndex: 2, paddingBottom: 10 },
  timerLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 5 },
  timerValue: { color: '#FFF', fontSize: 42, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: {width:0, height:2}, textShadowRadius: 4 },
  
  bgIcon: { position: 'absolute', right: -20, bottom: -20, opacity: 0.1 },

  // --- Month Header Styles ---
  monthHeaderContainer: { 
    paddingHorizontal: 20, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' 
  },
  monthHeaderText: { fontSize: 18, fontWeight: '800', marginRight: 10 },
  monthHeaderLine: { flex: 1, height: 1, opacity: 0.5 },

  // --- Table Header Styles ---
  tableHeader: { 
    flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, 
    borderBottomWidth: 1, elevation: 2, zIndex: 100, 
    alignItems: 'center', marginHorizontal: 16, borderRadius: 12, marginBottom: 5
  },
  colDateHeader: { width: '14%', textAlign: 'center', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  colTimeHeader: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // --- Day Block Styles ---
  dayBlock: { 
    marginHorizontal: 16, marginVertical: 6, padding: 16, borderRadius: 20, 
    borderWidth: 1, elevation: 2, position: 'relative', overflow: 'hidden'
  },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
  gregorianText: { fontSize: 15, fontWeight: '700' },
  hijriText: { fontSize: 13, fontWeight: '600' },
  
  timeLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  timeLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: '#8E8E93', fontWeight: '600' },
  
  timesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeValue: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '600' },

  todayIndicator: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  starIcon: { position: 'absolute', top: 10, right: 10 },
});