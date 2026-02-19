import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  StyleSheet, Text, View, Animated, Dimensions, Platform, 
  SafeAreaView, StatusBar, TouchableOpacity, ScrollView
} from 'react-native';
import { Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { Navigation, Compass as CompassIcon, MapPin, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(width * 0.75, height * 0.35);
const HALF_SIZE = COMPASS_SIZE / 2;

export default function QiblaScreen() {
  const navigation = useNavigation();
  const { theme, isDarkMode } = useTheme();
  
  const [heading, setHeading] = useState(0);
  const [qiblaAngle, setQiblaAngle] = useState(0); 
  const [isFocused, setIsFocused] = useState(false);
  const [locationName, setLocationName] = useState("Konum Bekleniyor...");

  // 🔥 PERFORMANS İÇİN REFERANSLAR (Kasmayı önleyen sistem)
  const isFocusedRef = useRef(false);
  const qiblaAngleRef = useRef(0);
  const lastHeadingRef = useRef(0);
  const cumulativeHeadingRef = useRef(0);
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let subscription;

    const startCompass = async () => {
      await getLocationAndQibla();

      // Pusula veri hızını 100ms yapıyoruz (Gereksiz render'ı engeller, Animasyon ile pürüzsüz akar)
      Magnetometer.setUpdateInterval(100); 
      
      subscription = Magnetometer.addListener((data) => {
        let angle = Math.atan2(-data.x, data.y) * (180 / Math.PI);
        if (angle < 0) angle += 360;

        // 🔥 1. KÜMÜLATİF DÖNÜŞ (360 -> 0 geçerken pusulanın çıldırmasını/geri sarmasını engeller)
        let diff = angle - lastHeadingRef.current;
        if (diff > 180) diff -= 360;
        else if (diff < -180) diff += 360;

        cumulativeHeadingRef.current += diff;
        lastHeadingRef.current = angle;

        // NATIVE DRIVER İLE YAĞ GİBİ DÖNÜŞ (Telefonun ekran kartını kullanır, kasmayı %100 çözer)
        Animated.timing(spinAnim, {
          toValue: -cumulativeHeadingRef.current,
          duration: 100,
          useNativeDriver: true,
        }).start();

        // Rakamları güncelle (Sadece değişirse güncelle ki ekran yorulmasın)
        const currentHeading = Math.round(angle);
        setHeading(prev => (Math.abs(prev - currentHeading) >= 1 ? currentHeading : prev));
        
        // 🔥 2. KIBLE HESAPLAMA (Render'ı tetiklemeden Ref üzerinden kontrol)
        let currentQibla = qiblaAngleRef.current;
        if (currentQibla > 0) {
          let qDiff = Math.abs(currentHeading - currentQibla);
          if (qDiff > 180) qDiff = 360 - qDiff;

          if (qDiff <= 3) { 
            if (!isFocusedRef.current) {
              isFocusedRef.current = true;
              setIsFocused(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          } else {
            if (isFocusedRef.current) {
              isFocusedRef.current = false;
              setIsFocused(false);
            }
          }
        }
      });
    };

    startCompass();

    return () => { if (subscription) subscription.remove(); };
  }, []); // <-- Dependency array boş! Artık her kıbleye geldiğinde dinleyici çöküp baştan başlamayacak!

  const getLocationAndQibla = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationName("İzin Gerekli"); return; }
      let location = await Location.getCurrentPositionAsync({});
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      let rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (rev.length > 0) setLocationName(rev[0].city || rev[0].region || "Mevcut Konum");

      const kabeLat = 21.4225; const kabeLng = 39.8262; const PI = Math.PI;
      let angle = (Math.atan2(Math.sin((kabeLng - lng) * PI / 180), Math.cos(lat * PI / 180) * Math.tan(kabeLat * PI / 180) - Math.sin(lat * PI / 180) * Math.cos((kabeLng - lng) * PI / 180)) * 180 / PI);
      if (angle < 0) angle += 360;
      
      const finalAngle = Math.round(angle);
      setQiblaAngle(finalAngle);
      qiblaAngleRef.current = finalAngle; // Ref'i de güncelliyoruz
    } catch (e) { console.log(e); }
  };

  const startAIChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('ChatScreen', { 
      initialMessage: "Yoldaş, her namazda Kabe'ye yönelmenin kalbimizdeki ve maneviyatımızdaki karşılığı nedir? Neden tek bir yöne dönüyoruz?" 
    });
  };

  // 🔥 PUSULA ÇİZGİLERİNİ HAFIZAYA AL (Telefonu yormasını engeller)
  const renderCompassTicks = useMemo(() => {
    const ticks = [];
    for (let i = 0; i < 360; i += 15) {
      const isCardinal = i % 90 === 0;
      ticks.push(
        <View key={i} style={[styles.tick, { height: isCardinal ? 12 : 6, width: isCardinal ? 2 : 1, backgroundColor: isCardinal ? theme.text : theme.subText, transform: [{ rotate: `${i}deg` }, { translateY: -HALF_SIZE + 8 }] }]} />
      );
    }
    return ticks;
  }, [theme]);

  // Animasyonu dereceye çeviren araç
  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1deg']
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 10 : 0 }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* ÜST BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card }]}>
          <ChevronLeft size={28} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.locationBadge}>
          <MapPin size={14} color={theme.primary} />
          <Text style={[styles.locationText, { color: theme.text }]}>{locationName}</Text>
        </View>
        <View style={{ width: 44 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* DERECE VE DURUM */}
        <View style={styles.degreeSection}>
          <Text style={[styles.degreeBig, { color: theme.text }]}>{heading}°</Text>
          <View style={[styles.statusBadge, { backgroundColor: isFocused ? theme.primary + '20' : theme.card }]}>
            <Text style={[styles.statusText, { color: isFocused ? theme.primary : theme.subText }]}>
              {isFocused ? "Kıbleye Döndünüz ✨" : `Kıble Açısı: ${qiblaAngle}°`}
            </Text>
          </View>
        </View>

        {/* PUSULA MERKEZİ */}
        <View style={styles.compassWrapper}>
          <View style={styles.targetPointer}>
            <View style={[styles.pointerArrow, { borderBottomColor: isFocused ? theme.primary : '#FF3B30' }]} />
            <View style={[styles.pointerLine, { backgroundColor: isFocused ? theme.primary : '#FF3B30' }]} />
          </View>

          {/* 🔥 DÖNEN PUSULA (Artık Animated.View ve Native Driver kullanıyor) */}
          <Animated.View style={[styles.compassCircle, { 
            width: COMPASS_SIZE, height: COMPASS_SIZE, borderRadius: COMPASS_SIZE / 2, 
            backgroundColor: theme.card, borderColor: isFocused ? theme.primary : theme.border,
            shadowColor: isFocused ? theme.primary : "#000",
            transform: [{ rotate: spinInterpolation }] // Kusursuz dönüş
          }]}>
            {renderCompassTicks}
            <View style={[styles.directionMarker, { transform: [{ translateY: -HALF_SIZE + 30 }] }]}><Text style={[styles.cardinalText, { color: '#FF3B30' }]}>N</Text></View>
            
            <View style={[styles.kabeMarkerContainer, { height: COMPASS_SIZE, transform: [{ rotate: `${qiblaAngle}deg` }] }]}>
              <View style={styles.kabeIconWrapper}>
                <Navigation size={28} color={theme.primary} fill={theme.primary} />
                <Text style={[styles.kabeLabel, { color: theme.primary }]}>KABE</Text>
              </View>
            </View>
            <View style={[styles.centerDot, { backgroundColor: theme.primary, opacity: isFocused ? 0.8 : 0.2 }]} />
          </Animated.View>
        </View>

        {/* BİLGİ KUTUSU */}
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <CompassIcon size={22} color={isFocused ? theme.primary : theme.subText} />
          <Text style={[styles.infoCardText, { color: theme.text }]}>
            {isFocused ? "Şu an Kabe yönündesiniz. Huzurla yönelebilirsiniz." : "Telefonu düz tutun ve Kabe sembolünü yukarıdaki kırmızı çizgiye hizalayın."}
          </Text>
        </View>

        {/* AI PROMPT BOX */}
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
                <Text style={[styles.aiTitle, { color: theme.text }]}>Kıble'nin Sırrını Sor</Text>
                <Text style={[styles.aiQuestion, { color: theme.subText }]} numberOfLines={1}>
                    "Kabe'ye yönelmenin manevi derinliği..."
                </Text>
            </View>

            <View style={styles.aiBoxRight}>
                <ChevronRight size={20} color={theme.primary} />
            </View>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 20, height: 60 
  },
  backButton: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  locationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  locationText: { fontSize: 13, fontWeight: '700', marginLeft: 6 },

  scrollContent: { paddingHorizontal: 25, alignItems: 'center' },
  
  degreeSection: { alignItems: 'center', marginVertical: 20 },
  degreeBig: { fontSize: 64, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -2 },
  statusBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 15, marginTop: -5 },
  statusText: { fontSize: 14, fontWeight: '800' },

  compassWrapper: { height: height * 0.42, justifyContent: 'center', alignItems: 'center' },
  targetPointer: { position: 'absolute', top: '10%', alignItems: 'center', zIndex: 10 },
  pointerArrow: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 18, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  pointerLine: { width: 3, height: 25, marginTop: -2, borderRadius: 2 },

  compassCircle: { 
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5,
    elevation: 25, shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.2, shadowRadius: 20 
  },
  tick: { position: 'absolute', borderRadius: 2 },
  directionMarker: { position: 'absolute' },
  cardinalText: { fontSize: 20, fontWeight: '900' },
  
  kabeMarkerContainer: { position: 'absolute', width: 2, justifyContent: 'flex-start', alignItems: 'center' },
  kabeIconWrapper: { marginTop: 12, alignItems: 'center', transform: [{rotate: '180deg'}] },
  kabeLabel: { fontSize: 9, fontWeight: '900', marginTop: 2 },
  centerDot: { width: 12, height: 12, borderRadius: 6 },

  infoCard: { 
    flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 24, 
    borderWidth: 1, marginBottom: 25, width: '100%' 
  },
  infoCardText: { flex: 1, marginLeft: 15, fontSize: 13, fontWeight: '600', lineHeight: 20 },

  aiBox: { 
    flexDirection: 'row', alignItems: 'center', padding: 15, 
    borderRadius: 24, borderWidth: 1, elevation: 4, width: '100%',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10
  },
  aiBoxLeft: { marginRight: 15 },
  aiIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  aiBoxCenter: { flex: 1 },
  aiTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  aiQuestion: { fontSize: 13, fontWeight: '500', fontStyle: 'italic' },
  aiBoxRight: { marginLeft: 10 }
});