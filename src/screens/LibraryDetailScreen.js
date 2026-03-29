import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, FlatList, Pressable, Animated, 
  SafeAreaView, ActivityIndicator, TextInput, Keyboard, Clipboard, Alert, Platform, StatusBar
} from 'react-native';
import { ChevronLeft, ChevronRight, Search, Copy, Sparkles, RefreshCw, BookOpen } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { fetchLibraryData } from '../services/apiService';
import * as Haptics from 'expo-haptics';
import axios from 'axios'; 
import { GUNLUK_DUALAR } from '../database/libraryData'; 

const SEARCH_TABS = [
  { id: 'sure', label: 'Sure' },
  { id: 'sayfa', label: 'Sayfa' },
  { id: 'cuz', label: 'Cüz' },
];

const KURAN_API_URL = process.env.EXPO_PUBLIC_KURAN_API_URL;

// 🔥 ANİMASYONLU KART BİLEŞENİ
const AnimatedCard = ({ children, onPress, theme }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
      <Animated.View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, transform: [{ scale: scaleValue }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function LibraryDetailScreen({ route }) {
  const navigation = useNavigation();
  const { theme, isDarkMode } = useTheme();
  const { categoryId, categoryTitle, type } = route.params;

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [activeTab, setActiveTab] = useState('sure');

  useEffect(() => {
    loadContent();
  }, [categoryId]);

  const loadContent = async () => {
    setLoading(true);
    if (categoryTitle.toLowerCase().includes('dua') || categoryId === 'gunluk-dualar') {
        const shuffled = [...GUNLUK_DUALAR].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 10);
        setData(selected);
        setFilteredData(selected);
    } else {
        const result = await fetchLibraryData(categoryId);
        if (result) {
          setData(result);
          setFilteredData(result);
        }
    }
    setLoading(false);
  };

  const refreshDuas = () => {
    if (categoryTitle.toLowerCase().includes('dua') || categoryId === 'gunluk-dualar') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        setTimeout(() => {
            const shuffled = [...GUNLUK_DUALAR].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 10);
            setData(selected);
            setFilteredData(selected);
            setLoading(false);
        }, 300);
    }
  };

  const startAIChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let initialMsg = `Selam Yoldaş! ${categoryTitle} konusu hakkında biraz hasbihal edebilir miyiz?`;
    if (type === 'quran') initialMsg = "Selam Yoldaş! Kur'an-ı Kerim'i anlamak ve hayatımıza uygulamak üzerine bize neler tavsiye edersin?";
    navigation.navigate('ChatScreen', { initialMessage: initialMsg });
  };

  const handleTabChange = (tabId) => {
    Haptics.selectionAsync();
    setActiveTab(tabId);
    setSearchQuery('');
    // Sekme değişince filtreyi sıfırla
    if (tabId === 'sure') setFilteredData(data);
  };

  const handleQuickGo = async (number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setNavigating(true);
      try {
          let targetSurahId = null;
          let targetSurahName = "";
          let targetAyahInSurah = null; 

          if (activeTab === 'sayfa') {
              const res = await axios.get(`${KURAN_API_URL}/page/${number}/quran-uthmani`);
              const firstAyah = res.data.data.ayahs[0];
              targetSurahId = firstAyah.surah.number;
              targetSurahName = firstAyah.surah.englishName;
              targetAyahInSurah = firstAyah.numberInSurah;
          } else if (activeTab === 'cuz') {
              const res = await axios.get(`${KURAN_API_URL}/juz/${number}/quran-uthmani`);
              const firstAyah = res.data.data.ayahs[0];
              targetSurahId = firstAyah.surah.number;
              targetSurahName = firstAyah.surah.englishName;
              targetAyahInSurah = firstAyah.numberInSurah;
          }

          if (targetSurahId) {
              const localSurah = data.find(d => d.id === targetSurahId.toString() || d.id === targetSurahId);
              navigation.navigate('SurahDetail', { 
                  surahId: targetSurahId, 
                  surahName: localSurah ? localSurah.title : targetSurahName,
                  initialAyah: targetAyahInSurah 
              });
          }
      } catch (error) {
          Alert.alert("Hata", "İlgili konuma ulaşılamadı.");
      } finally {
          setNavigating(false);
      }
  };

  // 🔥 YENİ: ARAMA FONKSİYONU SAYFA VE CÜZ İÇİN DE ÇALIŞIYOR
  const handleSearch = (text) => {
    setSearchQuery(text);
    
    if (text.trim() === '') {
      if (activeTab === 'sure') setFilteredData(data);
      return;
    }

    if (activeTab === 'sure') {
      const filtered = data.filter(item => 
          item.title.toLowerCase().includes(text.toLowerCase()) || 
          (item.detail && item.detail.toLowerCase().includes(text.toLowerCase())) ||
          item.id.toString() === text
      );
      setFilteredData(filtered);
    }
  };

  const handleItemPress = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (type === 'quran') {
      navigation.navigate('SurahDetail', { surahId: item.id, surahName: item.title });
    } else {
      Clipboard.setString(`${item.title}\n${item.detail}\n${item.meaning || item.source || ""}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Kopyalandı", "İçerik panoya kopyalandı.");
    }
  };

  // Sayfa veya Cüz listesini oluştururken arama filtresini uygula
  const getLinearData = () => {
    const totalCount = activeTab === 'sayfa' ? 604 : 30;
    const allItems = Array.from({length: totalCount}, (_, i) => i + 1);
    
    if (searchQuery.trim() === '') return allItems;
    return allItems.filter(num => num.toString().includes(searchQuery));
  };

  const renderListItemLinear = ({ item }) => (
    <AnimatedCard theme={theme} onPress={() => handleQuickGo(item)}>
      <View style={[styles.cardHeader, { marginBottom: 0 }]}>
        <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
          <View style={[styles.numberBox, { backgroundColor: theme.primary + '15', borderRadius: 12 }]}>
            <BookOpen size={16} color={theme.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.text, fontSize: 17, marginLeft: 5 }]}>
            {activeTab === 'cuz' ? `${item}. Cüz'den Başla` : `${item}. Sayfaya Git`}
          </Text>
        </View>
        <ChevronRight size={22} color={theme.subText} opacity={0.5} />
      </View>
    </AnimatedCard>
  );

  const renderListItem = ({ item, index }) => (
    <AnimatedCard theme={theme} onPress={() => handleItemPress(item)}>
      <View style={styles.cardHeader}>
        <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
          <View style={[styles.numberBox, { backgroundColor: theme.primary + '15' }]}>
            <Text style={[styles.numberText, { color: theme.primary }]}>
              {item.id && !isNaN(item.id) ? item.id : index + 1}
            </Text>
          </View>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
        </View>

        {type === 'quran' && item.page && (
          <View style={styles.badgeContainer}>
              <View style={[styles.badge, { backgroundColor: theme.background }]}><Text style={[styles.badgeText, { color: theme.subText }]}>Cüz {item.juz}</Text></View>
              <View style={[styles.badge, { backgroundColor: theme.primary + '15' }]}><Text style={[styles.badgeText, { color: theme.primary }]}>Sf. {item.page}</Text></View>
          </View>
        )}
        {type === 'quran' ? <ChevronRight size={20} color={theme.subText} /> : <Copy size={18} color={theme.subText} style={{opacity: 0.5}} />}
      </View>

      <Text style={[styles.cardDetail, { color: theme.text, opacity: 0.8 }]} numberOfLines={type === 'quran' ? 1 : undefined}>
        {item.detail}
      </Text>

      {(item.meaning || item.source) && (
        <View style={[styles.meaningContainer, { backgroundColor: theme.background }]}>
          <Text style={[styles.cardMeaning, { color: theme.subText }]}>{item.meaning || item.source}</Text>
        </View>
      )}
    </AnimatedCard>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 25) + 5 : 0 }]}>
      {navigating && (
          <View style={styles.navOverlay}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={{color: '#FFF', marginTop: 10, fontWeight: '600'}}>Sayfa Hazırlanıyor...</Text>
          </View>
      )}

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={({pressed}) => [{opacity: pressed ? 0.5 : 1}]}><ChevronLeft size={30} color={theme.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{categoryTitle}</Text>
        {(categoryTitle.toLowerCase().includes('dua') || categoryId === 'gunluk-dualar') ? (
            <Pressable onPress={refreshDuas} style={({pressed}) => [{opacity: pressed ? 0.5 : 1}]}><RefreshCw size={24} color={theme.primary} /></Pressable>
        ) : <View style={{width: 30}} />}
      </View>

      {/* SEKMELER & ARAMA BÖLÜMÜ */}
      {type === 'quran' ? (
        <View style={styles.quranHeader}>
            <View style={[styles.tabsPillContainer, { backgroundColor: isDarkMode ? '#1C1C1E' : '#F2F2F7' }]}>
                {SEARCH_TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <Pressable 
                        key={tab.id} 
                        style={[styles.tabPill, isActive && { backgroundColor: theme.card, shadowColor: '#000', elevation: 2, shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: {width: 0, height: 2} }]}
                        onPress={() => handleTabChange(tab.id)}
                    >
                        <Text style={[styles.tabPillText, { color: isActive ? theme.text : theme.subText, fontWeight: isActive ? '700' : '500' }]}>{tab.label}</Text>
                    </Pressable>
                  );
                })}
            </View>

            {/* ARAMA ÇUBUĞU ARTIK HER SEKMEDE VAR */}
            <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: 'transparent', shadowColor: '#000', elevation: 3, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: {width: 0, height: 4} }]}>
                <Search size={20} color={theme.subText} />
                <TextInput 
                    placeholder={activeTab === 'sure' ? "Sure adı veya numarası ara..." : activeTab === 'sayfa' ? "Sayfa numarası girin..." : "Cüz numarası girin..."} 
                    style={[styles.searchInput, { color: theme.text }]}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    placeholderTextColor={theme.subText}
                    keyboardType={activeTab === 'sure' ? "default" : "number-pad"}
                />
            </View>
        </View>
      ) : (
        <View style={styles.simpleSearchContainer}>
            <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: 'transparent', shadowColor: '#000', elevation: 3, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: {width: 0, height: 4} }]}>
                <Search size={20} color={theme.subText} />
                <TextInput 
                    placeholder="Kelime ara..." 
                    style={[styles.searchInput, { color: theme.text, marginLeft: 8 }]}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    placeholderTextColor={theme.subText}
                />
            </View>
        </View>
      )}

      {/* LİSTE */}
      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <FlatList
          key={activeTab} 
          data={activeTab === 'sure' ? filteredData : getLinearData()}
          renderItem={activeTab === 'sure' ? renderListItem : renderListItemLinear}
          keyExtractor={(item, index) => `${activeTab}-${item.id || item}-${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          ListFooterComponent={
            <AnimatedCard theme={theme} onPress={startAIChat}>
                <View style={styles.aiBox}>
                    <View style={styles.aiBoxLeft}>
                        <View style={[styles.aiIconCircle, { backgroundColor: theme.primary }]}>
                            <Sparkles size={20} color="#FFF" fill="#FFF" />
                        </View>
                    </View>
                    <View style={styles.aiBoxCenter}>
                        <Text style={[styles.aiTitle, { color: theme.text }]}>İlim ve Hikmet Sohbeti</Text>
                        <Text style={[styles.aiQuestion, { color: theme.subText }]} numberOfLines={1}>
                            {type === 'quran' ? "Kur'an'ın kalplere şifasını sor..." : "Bu duaların faziletini sor..."}
                        </Text>
                    </View>
                    <ChevronRight size={22} color={theme.primary} />
                </View>
            </AnimatedCard>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 999, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  
  quranHeader: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  tabsPillContainer: { flexDirection: 'row', padding: 4, borderRadius: 16, marginBottom: 15 },
  tabPill: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabPillText: { fontSize: 14 },
  
  simpleSearchContainer: { paddingHorizontal: 20, marginTop: 10, marginBottom: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 16, height: 52 },
  searchInput: { flex: 1, fontSize: 16, marginLeft: 12 },
  
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  card: { padding: 18, borderRadius: 20, marginBottom: 14, borderWidth: 1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  numberBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  numberText: { fontSize: 14, fontWeight: '800' },
  cardTitle: { fontSize: 17, fontWeight: '700', flex: 1 },
  badgeContainer: { flexDirection: 'row', marginRight: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 6 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  cardDetail: { fontSize: 15, lineHeight: 22 },
  meaningContainer: { padding: 12, borderRadius: 12, marginTop: 12 },
  cardMeaning: { fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  aiBox: { flexDirection: 'row', alignItems: 'center' },
  aiBoxLeft: { marginRight: 16 },
  aiIconCircle: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  aiBoxCenter: { flex: 1 },
  aiTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  aiQuestion: { fontSize: 14, fontStyle: 'italic' },
});