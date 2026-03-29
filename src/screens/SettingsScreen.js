import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, 
  TouchableOpacity, Switch, Alert, ScrollView, Platform, Share, Modal, 
  TextInput, TouchableWithoutFeedback, FlatList, Dimensions, StatusBar, Linking 
} from 'react-native';
import { 
  Bell, MapPin, Moon, Sun, Shield, Trash2, 
  ChevronRight, Share2, Star, Vibrate, X, Navigation, Search, Check, Volume2, PlayCircle, StopCircle 
} from 'lucide-react-native'; 
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av'; 
import { useTheme } from '../context/ThemeContext'; 

const { width } = Dimensions.get('window');

const TURKEY_CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin", "Aydın", 
  "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", 
  "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", 
  "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir", 
  "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kırıkkale", "Kırklareli", "Kırşehir", "Kilis", "Kocaeli", "Konya", "Kütahya", 
  "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye", 
  "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Şanlıurfa", "Şırnak", 
  "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"
];

const SOUND_OPTIONS = [
  { id: 'default', label: 'Varsayılan (Telefon)' },
  { id: 'ney', label: 'Ney Sesi 🎶' },
  { id: 'kus-civiltisi', label: 'Kuş Cıvıltısı 🐦' },
  { id: 'ruzgar-cani', label: 'Rüzgar Çanı 🎐' },
  { id: 'tibetan-bowl', label: 'Derin Çınlama 🧘' },
  { id: 'klasik', label: 'Klasik 🎸' }
];

const SOUND_FILES = {
  'ney': require('../../assets/sounds/ney.mp3'),
  'kus-civiltisi': require('../../assets/sounds/kuscivilti.mp3'),
  'ruzgar-cani': require('../../assets/sounds/ruzgarcan.mp3'),
  'tibetan-bowl': require('../../assets/sounds/thunderbowl.mp3'),
  'klasik': require('../../assets/sounds/arabicsounds.mp3')
};

const SettingItem = ({ icon: Icon, color, title, subtitle, isSwitch, value, onToggle, isDestructive, hasArrow, onPress, theme, isDarkMode, disabled }) => (
  <TouchableOpacity 
    style={[styles.menuItem, { borderBottomColor: theme.border, opacity: disabled ? 0.5 : 1 }]} 
    onPress={isSwitch ? () => !disabled && onToggle(!value) : disabled ? null : onPress}
    activeOpacity={isSwitch ? 1 : 0.7}
    delayPressIn={0}
    disabled={disabled && !isSwitch}
  >
    <View style={styles.menuLeft}>
      <View style={[styles.iconBox, { backgroundColor: isDestructive ? '#FFEBEE' : (isDarkMode ? '#2C2C2E' : color + '15') }]}>
        {Icon && <Icon size={22} color={isDestructive ? '#FF3B30' : color} />}
      </View>
      <View style={{marginLeft: 14, flex: 1}}>
        <Text style={[styles.menuText, { color: isDestructive ? '#FF3B30' : theme.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.menuSubtitle, { color: theme.subText }]} numberOfLines={1}>{subtitle}</Text>}
      </View>
    </View>
    
    {isSwitch ? (
      <Switch 
        value={value} 
        onValueChange={disabled ? null : onToggle}
        trackColor={{ false: "#E9E9EA", true: theme.primary }}
        thumbColor={'#FFF'} 
        disabled={disabled}
      />
    ) : hasArrow ? (
      <View style={{flexDirection:'row', alignItems:'center'}}>
         {typeof value === 'string' && <Text style={{color: theme.subText, marginRight: 8, fontSize: 13, fontWeight: '500'}}>{value}</Text>}
         <ChevronRight size={20} color={theme.subText} style={{opacity: 0.6}} />
      </View>
    ) : null}
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const navigation = useNavigation();

  const [notifyOnTime, setNotifyOnTime] = useState(true);
  const [notifyPreAlerts, setNotifyPreAlerts] = useState(true);
  const [selectedSound, setSelectedSound] = useState('default');
  
  const [useAutoLocation, setUseAutoLocation] = useState(true);
  const [selectedCity, setSelectedCity] = useState("İstanbul");
  const [detectedLocationText, setDetectedLocationText] = useState("Konum alınıyor..."); 
  const [hapticEnabled, setHapticEnabled] = useState(true);

  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [soundModalVisible, setSoundModalVisible] = useState(false);
  const [citySearch, setCitySearch] = useState("");

  const [soundObj, setSoundObj] = useState(null);
  const [playingSoundId, setPlayingSoundId] = useState(null); 

  useEffect(() => {
    loadSettings();
    if (useAutoLocation) getCurrentLocationName();
    return () => { if (soundObj) soundObj.unloadAsync(); };
  }, []);

  const loadSettings = async () => {
    try {
        const savedCity = await AsyncStorage.getItem('userCity');
        const savedAutoLoc = await AsyncStorage.getItem('useAutoLocation');
        const savedNotifyOnTime = await AsyncStorage.getItem('notifyOnTime');
        const savedNotifyPreAlerts = await AsyncStorage.getItem('notifyPreAlerts');
        const savedSound = await AsyncStorage.getItem('userNotificationSound');
        const savedHaptic = await AsyncStorage.getItem('hapticEnabled');
        
        if (savedCity) setSelectedCity(savedCity);
        if (savedAutoLoc !== null) setUseAutoLocation(JSON.parse(savedAutoLoc));
        if (savedNotifyOnTime !== null) setNotifyOnTime(JSON.parse(savedNotifyOnTime));
        if (savedNotifyPreAlerts !== null) setNotifyPreAlerts(JSON.parse(savedNotifyPreAlerts));
        if (savedSound) setSelectedSound(savedSound);
        if (savedHaptic !== null) setHapticEnabled(savedHaptic === 'true');
    } catch (e) { console.log("Ayarlar yüklenemedi", e); }
  };

  const getCurrentLocationName = async () => {
    try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setDetectedLocationText("İzin verilmedi"); return; }
        
        let loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced, 
            mayShowUserSettingsDialog: true
        });
        
        let reverseGeocode = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (reverseGeocode.length > 0) {
            const place = reverseGeocode[0];
            const city = place.region || place.subregion || place.city || "Bilinmiyor";
            setDetectedLocationText(city);
        }
    } catch (e) { setDetectedLocationText("Bulunamadı"); }
  };

  const toggleNotifyOnTime = async (val) => {
    setNotifyOnTime(val);
    await AsyncStorage.setItem('notifyOnTime', JSON.stringify(val));
    if (hapticEnabled) Haptics.selectionAsync();
  };

  const toggleNotifyPreAlerts = async (val) => {
    setNotifyPreAlerts(val);
    await AsyncStorage.setItem('notifyPreAlerts', JSON.stringify(val));
    if (hapticEnabled) Haptics.selectionAsync();
  };

  const closeSoundModal = async () => {
    if (soundObj) {
        await soundObj.stopAsync();
        await soundObj.unloadAsync();
        setSoundObj(null);
    }
    setPlayingSoundId(null);
    setSoundModalVisible(false);
  };

  const selectSound = async (soundId) => {
    setSelectedSound(soundId);
    await AsyncStorage.setItem('userNotificationSound', soundId);
    if (Platform.OS === 'android') {
        Alert.alert("Bilgi", "Ses değişikliğinin tam uygulanması için bir sonraki bildirim kurulumunu bekleyin.");
    }
    closeSoundModal();
  };

  const playSoundPreview = async (soundId) => {
    try {
      if (soundObj) {
          await soundObj.stopAsync();
          await soundObj.unloadAsync();
          setSoundObj(null);
      }
      if (playingSoundId === soundId) {
          setPlayingSoundId(null);
          return;
      }
      if (soundId === 'default') return; 

      const { sound } = await Audio.Sound.createAsync(SOUND_FILES[soundId]);
      setSoundObj(sound);
      setPlayingSoundId(soundId);

      sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
              setPlayingSoundId(null);
          }
      });

      await sound.playAsync();
    } catch (error) {
        console.log("Ses çalma hatası:", error);
        setPlayingSoundId(null);
    }
  };

  const toggleAutoLocation = async (val) => { setUseAutoLocation(val); await AsyncStorage.setItem('useAutoLocation', JSON.stringify(val)); if (val) getCurrentLocationName(); if (hapticEnabled) Haptics.selectionAsync(); };
  
  const selectCity = async (city) => { 
      setSelectedCity(city); 
      await AsyncStorage.setItem('userCity', city); 
      setUseAutoLocation(false); 
      await AsyncStorage.setItem('useAutoLocation', JSON.stringify(false)); 
      await Notifications.cancelAllScheduledNotificationsAsync(); 
      setCityModalVisible(false); 
      if (hapticEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); 
      Alert.alert("Konum Değişti", `${city} olarak ayarlandı.`); 
  };
  
  const toggleHaptic = async (val) => { 
    setHapticEnabled(val); 
    if (val) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); 
    try {
      await AsyncStorage.setItem('hapticEnabled', val.toString());
    } catch (error) {
      console.log("Ayar kaydetme hatası:", error);
    }
  };
  
  const handleResetData = () => { 
    if (hapticEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); 
    Alert.alert("Verileri Sıfırla", "Tüm ayarlar sıfırlanacak. Emin misiniz?", [
      { text: "Vazgeç", style: "cancel" }, 
      { text: "Sıfırla", style: "destructive", onPress: async () => { 
          await AsyncStorage.clear(); 
          await Notifications.cancelAllScheduledNotificationsAsync(); 
          Alert.alert("Başarılı", "Sıfırlandı."); 
      }} 
    ]); 
  };
  
  const openAppStoreRating = () => {
      if (hapticEnabled) Haptics.selectionAsync();
      
      const androidPackageName = 'com.emre.yoldas'; // Buraya kendi Google Play paket adını yazmalısın
      
      Alert.alert(
          "Bizi Değerlendirin ⭐",
          "Uygulamamızı beğendiniz mi? Bize mağazada puan vererek destek olabilirsiniz!",
          [
              { text: "Daha Sonra", style: "cancel" },
              { 
                  text: "Değerlendir", 
                  style: "default",
                  onPress: () => {
                      // Sadece Android Google Play bağlantısı
                      Linking.openURL(`market://details?id=${androidPackageName}`)
                      .catch(() => Linking.openURL(`https://play.google.com/store/apps/details?id=${androidPackageName}`));
                  }
              }
          ]
      );
  };
  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Sana manevi yolculuğunda eşlik edecek harika bir uygulama buldum: Yoldaş! Hemen indir: https://play.google.com/store/apps/details?id=com.emre.yoldas',
      });
    } catch (error) {
      console.log('Paylaşım hatası:', error);
    }
  };

  const filteredCities = TURKEY_CITIES.filter(city => city.toLowerCase().includes(citySearch.toLowerCase()));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 25) + 10 : 0 }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
           <Text style={[styles.pageTitle, { color: theme.text }]}>Ayarlar</Text>
           <Text style={[styles.pageSubtitle, { color: theme.subText }]}>Uygulamanı kişiselleştir</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.subText }]}>BİLDİRİM & SESLER</Text>
          <View style={[styles.menuBox, { backgroundColor: theme.card, shadowColor: theme.text }]}>
            <SettingItem icon={Bell} color="#FF9500" title="Vakit Bildirimleri" subtitle="Ezan vaktinde bildirim al" isSwitch value={notifyOnTime} onToggle={toggleNotifyOnTime} theme={theme} isDarkMode={isDarkMode} />
            <SettingItem icon={Bell} color="#FFCC00" title="45 Dakika Kala" subtitle="Öncesinde Yoldaş uyarısı" isSwitch value={notifyPreAlerts} onToggle={toggleNotifyPreAlerts} theme={theme} isDarkMode={isDarkMode} />
            <SettingItem icon={Volume2} color="#5856D6" title="Bildirim Sesi" subtitle={SOUND_OPTIONS.find(s => s.id === selectedSound)?.label} hasArrow onPress={() => setSoundModalVisible(true)} theme={theme} isDarkMode={isDarkMode} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.subText }]}>KONUM & ZAMAN</Text>
          <View style={[styles.menuBox, { backgroundColor: theme.card, shadowColor: theme.text }]}>
            <SettingItem icon={Navigation} color="#34C759" title="Otomatik Konum" subtitle={useAutoLocation ? `Tespit: ${detectedLocationText}` : "Kapalı"} isSwitch value={useAutoLocation} onToggle={toggleAutoLocation} theme={theme} isDarkMode={isDarkMode} />
            <SettingItem icon={MapPin} color="#007AFF" title="Şehir Seçimi" subtitle={useAutoLocation ? "Otomatik konum aktif" : "Manuel seçim yapın"} hasArrow value={useAutoLocation ? "" : selectedCity} onPress={() => setCityModalVisible(true)} disabled={useAutoLocation} theme={theme} isDarkMode={isDarkMode} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.subText }]}>SİSTEM & GÖRÜNÜM</Text>
          <View style={[styles.menuBox, { backgroundColor: theme.card, shadowColor: theme.text }]}>
            <SettingItem icon={isDarkMode ? Moon : Sun} color={isDarkMode ? "#FFD60A" : "#FF9500"} title="Koyu Mod" isSwitch value={isDarkMode} onToggle={() => { toggleTheme(); if(hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} theme={theme} isDarkMode={isDarkMode} />
            <SettingItem icon={Vibrate} color="#AF52DE" title="Titreşim" isSwitch value={hapticEnabled} onToggle={toggleHaptic} theme={theme} isDarkMode={isDarkMode} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.subText }]}>GENEL</Text>
          <View style={[styles.menuBox, { backgroundColor: theme.card, shadowColor: theme.text }]}>
            <SettingItem icon={Share2} color="#007AFF" title="Paylaş" hasArrow onPress={handleShare} theme={theme} isDarkMode={isDarkMode}/>
            <SettingItem icon={Star} color="#FFD60A" title="Bizi Değerlendir" hasArrow onPress={openAppStoreRating} theme={theme} isDarkMode={isDarkMode}/>
            <SettingItem icon={Shield} color="#5856D6" title="Gizlilik Politikası" hasArrow onPress={() => navigation.navigate('PrivacyPolicy')} theme={theme} isDarkMode={isDarkMode}/>
            <SettingItem icon={Trash2} color="#FF3B30" title="Verileri Sıfırla" isDestructive onPress={handleResetData} theme={theme} isDarkMode={isDarkMode}/>
          </View>
        </View>
        
        <View style={styles.footer}><Text style={[styles.versionText, { color: theme.subText }]}>Yoldaş v1.0</Text></View>
      </ScrollView>

      {/* --- SES SEÇİMİ MODALI --- */}
      <Modal animationType="slide" transparent={true} visible={soundModalVisible} onRequestClose={closeSoundModal}>
         <TouchableWithoutFeedback onPress={closeSoundModal}>
             <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                    <View style={[styles.modalContent, { backgroundColor: theme.card, height: '50%' }]}>
                       <View style={styles.modalHandle} />
                       <Text style={[styles.modalTitleCenter, {color: theme.text, marginBottom: 20}]}>Bildirim Sesi Seç</Text>
                       <FlatList 
                          data={SOUND_OPTIONS}
                          keyExtractor={item => item.id}
                          renderItem={({ item }) => (
                             <View style={[styles.soundItem, { borderBottomColor: theme.border }]}>
                                <TouchableOpacity 
                                   style={{flex: 1, flexDirection: 'row', alignItems: 'center'}} 
                                   onPress={() => selectSound(item.id)}
                                >
                                   {selectedSound === item.id && <Check size={20} color={theme.primary} style={{marginRight: 10}} />}
                                   <Text style={[styles.menuText, { color: theme.text, fontWeight: selectedSound === item.id ? 'bold' : 'normal' }]}>{item.label}</Text>
                                </TouchableOpacity>
                                
                                {item.id !== 'default' && (
                                   <TouchableOpacity onPress={() => playSoundPreview(item.id)} style={{padding: 5}}>
                                      {playingSoundId === item.id ? (
                                          <StopCircle size={24} color="#FF3B30" /> 
                                      ) : (
                                          <PlayCircle size={24} color={theme.primary} />
                                      )}
                                   </TouchableOpacity>
                                )}
                             </View>
                          )}
                       />
                    </View>
                </TouchableWithoutFeedback>
             </View>
         </TouchableWithoutFeedback>
      </Modal>

      {/* --- ŞEHİR SEÇİMİ MODALI --- */}
      <Modal animationType="slide" transparent={false} visible={cityModalVisible} onRequestClose={() => setCityModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            <View style={styles.modalHeaderFull}>
                <TouchableOpacity onPress={() => setCityModalVisible(false)} style={styles.closeBtn}><X size={24} color={theme.text} /></TouchableOpacity>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Şehir Seçin</Text>
                <View style={{width: 24}} /> 
            </View>
            <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
                <Search size={20} color={theme.subText} />
                <TextInput style={[styles.searchInput, { color: theme.text }]} placeholder="Şehir ara..." placeholderTextColor={theme.subText} value={citySearch} onChangeText={setCitySearch} />
            </View>
            <FlatList data={filteredCities} keyExtractor={(item) => item} contentContainerStyle={{padding: 20}} renderItem={({ item }) => (
                <TouchableOpacity style={[styles.cityItem, { borderBottomColor: theme.border }]} onPress={() => selectCity(item)}>
                    <Text style={[styles.cityText, { color: theme.text, fontWeight: item === selectedCity ? 'bold' : 'normal' }]}>{item}</Text>
                    {item === selectedCity && <Check size={20} color={theme.primary} />}
                </TouchableOpacity>
            )} />
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  header: { marginBottom: 25, paddingHorizontal: 10 },
  pageTitle: { fontSize: 34, fontWeight: '800', letterSpacing: 0.5, marginBottom: 5 },
  pageSubtitle: { fontSize: 16, fontWeight: '500' },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10, marginLeft: 15, letterSpacing: 1, textTransform: 'uppercase' },
  menuBox: { borderRadius: 20, overflow: 'hidden', elevation: 3, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10 },
  menuItem: { flexDirection: 'row', padding: 18, borderBottomWidth: 1, alignItems: 'center', justifyContent: 'space-between', borderBottomColor: 'rgba(0,0,0,0.05)' },
  menuLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuText: { fontSize: 16, fontWeight: '600' },
  menuSubtitle: { fontSize: 12, marginTop: 3 },
  footer: { alignItems: 'center', marginTop: 10, marginBottom: 20 },
  versionText: { fontSize: 14, fontWeight: '600', opacity: 0.7 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }, 
  modalContent: { width: '100%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: 50, elevation: 20 },
  modalHandle: { width: 40, height: 5, backgroundColor: 'rgba(120,120,120,0.3)', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalTitleCenter: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  soundItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  modalHeaderFull: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  closeBtn: { padding: 5 },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 20, marginTop: 0, padding: 14, borderRadius: 16 },
  searchInput: { marginLeft: 12, flex: 1, fontSize: 16 },
  cityItem: { paddingVertical: 18, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
  cityText: { fontSize: 17 }
});