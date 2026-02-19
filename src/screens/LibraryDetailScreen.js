import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, 
  SafeAreaView, ActivityIndicator, TextInput, Keyboard, Clipboard, Alert, Platform, StatusBar
} from 'react-native';
import { ChevronLeft, ChevronRight, Search, X, Copy, Sparkles, RefreshCw } from 'lucide-react-native';
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
    let initialMsg = `Selam Yoldaş! ${categoryTitle} konusu hakkında biraz hasbihal edebilir miyiz? Bu içeriklerin manevi hayatımıza katacağı güzellikler nelerdir?`;
    
    if (type === 'quran') {
        initialMsg = "Selam Yoldaş! Kur'an-ı Kerim'i anlamak, ayetlerin nuruyla hayatımızı aydınlatmak üzerine bize neler tavsiye edersin? Surelerin sırlarını nasıl keşfedebiliriz?";
    } else if (categoryTitle.toLowerCase().includes('dua')) {
        initialMsg = "Selam Yoldaş! Bugün okuduğum duaların kabul olması ve kalbime huzur vermesi için neler yapmalıyım?";
    }

    navigation.navigate('ChatScreen', { initialMessage: initialMsg });
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchQuery('');
  };

  // 🔥 ÇÖZÜLEN KISIM BURASI: TAM SEÇİLEN SAYFA/CÜZE GİDER
  const handleQuickGo = async (number) => {
      setNavigating(true);
      try {
          let targetSurahId = null;
          let targetSurahName = "";
          let targetPage = null;
          let targetAyah = null;

          if (activeTab === 'sayfa') {
              const res = await axios.get(`${KURAN_API_URL}/page/${number}/quran-uthmani?limit=1`);
              const firstAyah = res.data.data.ayahs[0];
              targetSurahId = firstAyah.surah.number;
              targetSurahName = firstAyah.surah.englishName;
              targetPage = number; // 🔥 Direk tıklanılan sayfa numarasını zorla gönderiyoruz
              targetAyah = firstAyah.numberInSurah;
          } else if (activeTab === 'cuz') {
              const res = await axios.get(`${KURAN_API_URL}/juz/${number}/quran-uthmani?limit=1`);
              const firstAyah = res.data.data.ayahs[0];
              targetSurahId = firstAyah.surah.number;
              targetSurahName = firstAyah.surah.englishName;
              targetPage = firstAyah.page; // Cüzlerin başlangıç sayfası API'den gelir, o doğrudur.
              targetAyah = firstAyah.numberInSurah;
          }

          if (targetSurahId) {
              const localSurah = data.find(d => d.id === targetSurahId.toString());
              navigation.navigate('SurahDetail', { 
                  surahId: targetSurahId, 
                  surahName: localSurah ? localSurah.title : targetSurahName,
                  initialPage: targetPage, 
                  initialAyah: targetAyah
              });
          }
      } catch (error) {
          Alert.alert("Hata", "İlgili konuma ulaşılamadı.");
      } finally {
          setNavigating(false);
      }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredData(data);
      return;
    }
    const filtered = data.filter(item => 
        item.title.toLowerCase().includes(text.toLowerCase()) || 
        (item.detail && item.detail.toLowerCase().includes(text.toLowerCase())) ||
        (item.meaning && item.meaning.toLowerCase().includes(text.toLowerCase())) ||
        item.id.toString() === text
    );
    setFilteredData(filtered);
  };

  const handleItemPress = (item) => {
    if (type === 'quran') {
      navigation.navigate('SurahDetail', { 
        surahId: item.id, 
        surahName: item.title,
        initialPage: item.page 
      });
    } else {
      Clipboard.setString(`${item.title}\n${item.detail}\n${item.meaning || item.source || ""}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Kopyalandı", "İçerik panoya kopyalandı.");
    }
  };

  const renderGridItem = ({ item }) => (
      <TouchableOpacity 
        style={[styles.gridItem, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => handleQuickGo(item)}
      >
          <Text style={[styles.gridText, { color: theme.text }]}>
              {activeTab === 'cuz' ? `${item}. Cüz` : `${item}. Sayfa`}
          </Text>
      </TouchableOpacity>
  );

  const renderListItem = ({ item, index }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
      onPress={() => handleItemPress(item)}
    >
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
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 25) + 5 : 0 }]}>
      {navigating && (
          <View style={styles.navOverlay}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={{color: '#FFF', marginTop: 10, fontWeight: '600'}}>Hedef Bulunuyor...</Text>
          </View>
      )}

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ChevronLeft size={28} color={theme.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{categoryTitle}</Text>
        
        {(categoryTitle.toLowerCase().includes('dua') || categoryId === 'gunluk-dualar') ? (
            <TouchableOpacity onPress={refreshDuas}>
                <RefreshCw size={24} color={theme.primary} />
            </TouchableOpacity>
        ) : (
            <View style={{width: 28}} />
        )}
      </View>

      {type === 'quran' ? (
        <View style={styles.quranHeader}>
            <View style={[styles.tabsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {SEARCH_TABS.map((tab) => (
                    <TouchableOpacity 
                        key={tab.id} 
                        style={[styles.tabButton, activeTab === tab.id && { backgroundColor: theme.primary }]}
                        onPress={() => handleTabChange(tab.id)}
                    >
                        <Text style={[styles.tabText, { color: activeTab === tab.id ? '#FFF' : theme.subText }]}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {activeTab === 'sure' && (
                <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                    <Search size={18} color={theme.subText} />
                    <TextInput 
                        placeholder="Sure ara..." 
                        style={[styles.searchInput, { color: theme.text }]}
                        value={searchQuery}
                        onChangeText={handleSearch}
                        placeholderTextColor={theme.subText}
                    />
                </View>
            )}
        </View>
      ) : (
        <View style={styles.simpleSearchContainer}>
            <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                <Search size={18} color={theme.subText} />
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

      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <FlatList
          key={`${activeTab}-${activeTab === 'sure' ? 1 : 3}`} 
          data={
              activeTab === 'sure' ? filteredData : 
              activeTab === 'sayfa' ? Array.from({length: 604}, (_, i) => i + 1) : 
              Array.from({length: 30}, (_, i) => i + 1)
          }
          renderItem={activeTab === 'sure' ? renderListItem : renderGridItem}
          numColumns={activeTab === 'sure' ? 1 : 3} 
          keyExtractor={(item, index) => `${activeTab}-${item.id || item}-${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={activeTab === 'sure' ? 20 : 60}
          removeClippedSubviews={Platform.OS === 'android'}
          ListFooterComponent={
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
                    <Text style={[styles.aiTitle, { color: theme.text }]}>İlim ve Hikmet Sohbeti</Text>
                    <Text style={[styles.aiQuestion, { color: theme.subText }]} numberOfLines={1}>
                        {type === 'quran' ? "Kur'an'ın kalplere şifasını sor..." : "Bu duaların faziletini sor..."}
                    </Text>
                </View>
                <View style={styles.aiBoxRight}>
                    <ChevronRight size={20} color={theme.primary} />
                </View>
            </TouchableOpacity>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 999, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  quranHeader: { padding: 16 },
  tabsContainer: { flexDirection: 'row', padding: 4, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  tabButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabText: { fontSize: 13, fontWeight: '600' },
  simpleSearchContainer: { paddingHorizontal: 16, marginTop: 15, marginBottom: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRadius: 12, height: 45 },
  searchInput: { flex: 1, fontSize: 16, marginLeft: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  card: { padding: 16, borderRadius: 16, marginBottom: 12, elevation: 1, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  numberBox: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  numberText: { fontSize: 12, fontWeight: 'bold' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  badgeContainer: { flexDirection: 'row', marginRight: 10 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  cardDetail: { fontSize: 14, lineHeight: 22 },
  meaningContainer: { padding: 10, borderRadius: 8, marginTop: 8 },
  cardMeaning: { fontSize: 13, fontStyle: 'italic' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gridItem: { flex: 1, margin: 4, height: 55, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1 },
  gridText: { fontSize: 13, fontWeight: '700' },

  // AI BOX STYLES
  aiBox: { 
    flexDirection: 'row', alignItems: 'center', padding: 18, 
    borderRadius: 24, borderWidth: 1, elevation: 4, marginTop: 20,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10
  },
  aiBoxLeft: { marginRight: 15 },
  aiIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  aiBoxCenter: { flex: 1 },
  aiTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  aiQuestion: { fontSize: 13, fontWeight: '500', fontStyle: 'italic' },
  aiBoxRight: { marginLeft: 10 }
});