import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, ActivityIndicator, 
  SafeAreaView, TouchableOpacity, Platform, Dimensions, Alert, StatusBar, Modal
} from 'react-native';
import { ChevronLeft, ChevronRight, Heart, Sparkles, Settings2, X, Plus, Minus } from 'lucide-react-native';
import { fetchSurahDetail } from '../services/apiService';
import { addFavorite, removeFavorite, isFavorite } from '../database/db';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const IS_SMALL_SCREEN = width < 375;

const DEFAULT_ARABIC_SIZE = IS_SMALL_SCREEN ? 26 : 32;
const DEFAULT_TURKISH_SIZE = IS_SMALL_SCREEN ? 15 : 17;

const AYAH_PER_PAGE = 7; 

const toArabicNum = (num) => num.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

const cleanArabicText = (text, surahId, ayahNumber) => {
  if (Number(surahId) !== 1 && Number(surahId) !== 9 && Number(ayahNumber) === 1) {
    const exactBismillah = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
    let cleanedText = text.replace(exactBismillah, "").trim();

    if (cleanedText.includes("بِسْمِ") && cleanedText.includes("ٱلرَّحِيمِ")) {
       const parts = cleanedText.split("ٱلرَّحِيمِ");
       if (parts.length > 1) {
           cleanedText = parts.slice(1).join("ٱلرَّحِيمِ").trim();
       }
    }
    
    return cleanedText.replace(/^[\s\u200B-\u200D\uFEFF]+/, '').trim();
  }
  return text;
};

export default function SurahDetailScreen({ route, navigation }) {
  const { surahId, surahName, initialAyah } = route.params;
  const { theme, isDarkMode } = useTheme();
  
  const [fullData, setFullData] = useState(null);
  const [currentPageData, setCurrentPageData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState({});
  
  const [currentQuranPage, setCurrentQuranPage] = useState(null);
  const [availablePages, setAvailablePages] = useState([]); 
  const scrollViewRef = useRef();

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [arabicFontSize, setArabicFontSize] = useState(DEFAULT_ARABIC_SIZE);
  const [turkishFontSize, setTurkishFontSize] = useState(DEFAULT_TURKISH_SIZE);

  const startAIChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const initialMsg = `Selam Yoldaş! Şu an ${surahName} Suresi'ni okuyorum. Bana bu ayetlerin genel mesajını ve manevi derinliğini kısaca anlatır mısın?`;
    navigation.navigate('ChatScreen', { initialMessage: initialMsg });
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true); 
        
        const savedSettings = await AsyncStorage.getItem('reader_settings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            if (parsed.arabicSize) setArabicFontSize(parsed.arabicSize);
            if (parsed.turkishSize) setTurkishFontSize(parsed.turkishSize);
        }

        const result = await fetchSurahDetail(surahId);
        
        if (result && result.arabic && result.arabic.length > 0) {
          setFullData(result);
          
          const pagesSet = new Set();
          result.arabic.forEach(ayah => {
             pagesSet.add(ayah.page); 
          });
          const pagesArray = Array.from(pagesSet).sort((a,b) => a - b);
          setAvailablePages(pagesArray);
          
          let targetQuranPage = pagesArray[0]; 
          if (initialAyah) {
             const targetAyahObj = result.arabic.find(a => Number(a.numberInSurah) === Number(initialAyah));
             if (targetAyahObj) targetQuranPage = targetAyahObj.page;
          } 
          
          loadQuranPage(targetQuranPage, result);
          
          const favStatus = {};
          result.arabic.forEach((ayah) => {
            const num = ayah.numberInSurah; 
            const favId = `surah-${surahId}-${num}`;
            favStatus[favId] = isFavorite(favId);
          });
          setFavorites(favStatus);
        }
      } catch (error) { 
          console.log(error); 
          Alert.alert("Hata", "Sure yüklenirken bir sorun oluştu.");
      } finally { 
          setLoading(false); 
      }
    };
    init();
  }, [surahId, initialAyah]);

  const saveFontSettings = async (arabicSize, turkishSize) => {
      try {
          await AsyncStorage.setItem('reader_settings', JSON.stringify({ arabicSize, turkishSize }));
      } catch (e) { console.log(e); }
  };

  const changeFontSize = (type, action) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (type === 'arabic') {
          setArabicFontSize(prev => {
              const newSize = action === 'plus' ? Math.min(prev + 2, 50) : Math.max(prev - 2, 20);
              saveFontSettings(newSize, turkishFontSize);
              return newSize;
          });
      } else {
          setTurkishFontSize(prev => {
              const newSize = action === 'plus' ? Math.min(prev + 1, 24) : Math.max(prev - 1, 12);
              saveFontSettings(arabicFontSize, newSize);
              return newSize;
          });
      }
  };

  const loadQuranPage = (quranPageNumber, sourceData = fullData) => {
    if (!sourceData || !sourceData.arabic) return;
    
    const filteredAyahs = sourceData.arabic.filter(ayah => ayah.page === quranPageNumber);
    
    const combinedData = filteredAyahs.map((ayah) => {
        const globalIndex = sourceData.arabic.findIndex(a => a.numberInSurah === ayah.numberInSurah);
        return {
            ...ayah,
            turkishText: sourceData.turkish[globalIndex] ? sourceData.turkish[globalIndex].text : "",
            localIndex: ayah.numberInSurah,
            cleanText: cleanArabicText(ayah.text, surahId, ayah.numberInSurah)
        };
    });
    
    setCurrentPageData(combinedData);
    setCurrentQuranPage(quranPageNumber);
    
    if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  };

  const handleNextPage = () => { 
      const currentIndex = availablePages.indexOf(currentQuranPage);
      if (currentIndex < availablePages.length - 1) {
          loadQuranPage(availablePages[currentIndex + 1]);
      }
  };

  const handlePrevPage = () => { 
      const currentIndex = availablePages.indexOf(currentQuranPage);
      if (currentIndex > 0) {
          loadQuranPage(availablePages[currentIndex - 1]);
      }
  };

  const toggleFavorite = (ayah) => {
    const favId = `surah-${surahId}-${ayah.localIndex}`;
    const currentlyFav = favorites[favId];
    if (currentlyFav) removeFavorite(favId);
    else addFavorite({ id: favId, catId: '4', surahName, arabic: ayah.text, turkish: ayah.turkishText, number: ayah.localIndex });
    setFavorites({ ...favorites, [favId]: !currentlyFav });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (loading) return <View style={[styles.centered, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

  const referenceAyah = currentPageData[0];
  const quranJuz = referenceAyah ? referenceAyah.juz : '-';
  
  const isFirstPage = availablePages.indexOf(currentQuranPage) === 0;
  const isLastPage = availablePages.indexOf(currentQuranPage) === availablePages.length - 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 25) + 5 : 0 }]}>
      
      {/* ŞIK HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <ChevronLeft size={28} color={theme.text} />
        </TouchableOpacity>
        
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={[styles.topInfoText, { color: theme.subText }]}>Cüz {quranJuz} • Sayfa {currentQuranPage}</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{surahName}</Text>
        </View>
        
        <TouchableOpacity onPress={startAIChat} style={styles.iconButton}>
            <Sparkles size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ZARİF BESMELE */}
        {(currentPageData.some(a => a.localIndex === 1) && Number(surahId) !== 1 && Number(surahId) !== 9) && (
          <View style={styles.bismillahContainer}>
              <Text style={[styles.bismillah, { color: theme.text, fontSize: arabicFontSize + 2 }]}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</Text>
              <View style={[styles.bismillahUnderline, { backgroundColor: theme.border }]} />
          </View>
        )}

        {/* AYET KARTLARI */}
        {currentPageData.map((ayah) => {
          const isFav = favorites[`surah-${surahId}-${ayah.localIndex}`];
          return (
            <View key={ayah.localIndex} style={[styles.ayahCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardTopRow}>
                  <View style={[styles.ayahBadge, { backgroundColor: theme.primary + '15' }]}>
                      <Text style={[styles.ayahBadgeText, { color: theme.primary }]}>{ayah.localIndex}. Ayet</Text>
                  </View>
                  <TouchableOpacity style={styles.cardFavIcon} onPress={() => toggleFavorite(ayah)}>
                      <Heart size={22} color={isFav ? "#E74C3C" : theme.subText} fill={isFav ? "#E74C3C" : "transparent"} />
                  </TouchableOpacity>
              </View>

              <Text style={[styles.arabicText, { color: theme.text, fontSize: arabicFontSize, lineHeight: arabicFontSize * 1.9 }]}>
                {ayah.cleanText} {'\u00A0'} 
                <Text style={[styles.ayahEndSymbol, { fontSize: Math.max(arabicFontSize - 6, 16) }]}>﴿{toArabicNum(ayah.localIndex)}﴾</Text>
              </Text>

              <View style={styles.dividerContainer}>
                  <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                  <View style={[styles.dividerDot, { backgroundColor: theme.subText }]} />
                  <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              </View>

              <Text style={[styles.turkishText, { color: theme.text, fontSize: turkishFontSize, lineHeight: turkishFontSize * 1.6 }]}>
                {ayah.turkishText}
              </Text>
            </View>
          );
        })}

        {/* AI KUTUSU */}
        <TouchableOpacity 
            style={[styles.aiBox, { backgroundColor: theme.card, borderColor: theme.border }]} 
            onPress={startAIChat} 
            activeOpacity={0.8}
        >
            <View style={styles.aiBoxLeft}>
                <View style={[styles.aiIconCircle, { backgroundColor: theme.primary + '15' }]}>
                    <Sparkles size={20} color={theme.primary} />
                </View>
            </View>
            <View style={styles.aiBoxCenter}>
                <Text style={[styles.aiTitle, { color: theme.text }]}>Tefekkür Et</Text>
                <Text style={[styles.aiQuestion, { color: theme.subText }]} numberOfLines={1}>"Ayetlerin manevi derinliğini sor..."</Text>
            </View>
            <ChevronRight size={20} color={theme.subText} opacity={0.5} />
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* AYARLAR MODALI */}
      <Modal visible={settingsVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
              <View style={[styles.settingsContent, { backgroundColor: theme.card }]}>
                  <View style={styles.settingsHeader}>
                      <Text style={[styles.settingsTitle, { color: theme.text }]}>Okuma Görünümü</Text>
                      <TouchableOpacity onPress={() => setSettingsVisible(false)} style={styles.closeBtn}>
                          <X size={24} color={theme.subText} />
                      </TouchableOpacity>
                  </View>

                  <View style={[styles.settingRow, { borderBottomColor: theme.border, borderBottomWidth: 1, paddingBottom: 20 }]}>
                      <Text style={[styles.settingLabel, { color: theme.text }]}>Arapça Boyutu</Text>
                      <View style={styles.controlGroup}>
                          <TouchableOpacity style={[styles.controlBtn, { backgroundColor: theme.background }]} onPress={() => changeFontSize('arabic', 'minus')}>
                              <Minus size={20} color={theme.text} />
                          </TouchableOpacity>
                          <Text style={[styles.controlText, { color: theme.text }]}>{arabicFontSize}</Text>
                          <TouchableOpacity style={[styles.controlBtn, { backgroundColor: theme.background }]} onPress={() => changeFontSize('arabic', 'plus')}>
                              <Plus size={20} color={theme.text} />
                          </TouchableOpacity>
                      </View>
                  </View>

                  <View style={[styles.settingRow, { paddingTop: 20 }]}>
                      <Text style={[styles.settingLabel, { color: theme.text }]}>Türkçe Boyutu</Text>
                      <View style={styles.controlGroup}>
                          <TouchableOpacity style={[styles.controlBtn, { backgroundColor: theme.background }]} onPress={() => changeFontSize('turkish', 'minus')}>
                              <Minus size={20} color={theme.text} />
                          </TouchableOpacity>
                          <Text style={[styles.controlText, { color: theme.text }]}>{turkishFontSize}</Text>
                          <TouchableOpacity style={[styles.controlBtn, { backgroundColor: theme.background }]} onPress={() => changeFontSize('turkish', 'plus')}>
                              <Plus size={20} color={theme.text} />
                          </TouchableOpacity>
                      </View>
                  </View>
              </View>
          </View>
      </Modal>

      {/* ŞIK SAYFALAMA BAR'I */}
      <View style={[styles.paginationBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableOpacity 
            style={[styles.pageButton, isFirstPage && styles.disabledButton]} 
            onPress={handlePrevPage} disabled={isFirstPage}
        >
          <ChevronLeft size={20} color={isFirstPage ? theme.subText : theme.text} />
        </TouchableOpacity>
        
        <TouchableOpacity 
            style={[styles.pageInfo, { backgroundColor: theme.background }]} 
            onPress={() => setSettingsVisible(true)}
            activeOpacity={0.7}
        >
            <Settings2 size={16} color={theme.primary} style={{marginRight: 6}} />
            <Text style={[styles.pageText, { color: theme.primary }]}>Ayarlar • Sayfa {currentQuranPage}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
            style={[styles.pageButton, isLastPage && styles.disabledButton]} 
            onPress={handleNextPage} disabled={isLastPage}
        >
          <ChevronRight size={20} color={isLastPage ? theme.subText : theme.text} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.03, shadowRadius: 3 },
  topInfoText: { fontSize: 11, fontWeight: '700', marginBottom: 4, letterSpacing: 0.8, textTransform: 'uppercase' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', width: '90%', textAlign: 'center' },
  iconButton: { padding: 8, width: 40, alignItems: 'center' },
  
  scrollContent: { padding: 20 },
  
  // Besmele
  bismillahContainer: { marginBottom: 30, alignItems: 'center', justifyContent: 'center' },
  bismillah: { fontFamily: Platform.OS === 'ios' ? 'GeezaPro-Bold' : 'sans-serif', textAlign: 'center', marginBottom: 15 },
  bismillahUnderline: { height: 1, width: '40%', opacity: 0.5, borderRadius: 5 },

  // Ayet Kartları
  ayahCard: { borderRadius: 24, padding: 24, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, borderWidth: 1 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  ayahBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  ayahBadgeText: { fontSize: 12, fontWeight: '700' },
  cardFavIcon: { padding: 4 },
  
  arabicText: { textAlign: 'right', writingDirection: 'rtl', fontFamily: Platform.OS === 'ios' ? 'GeezaPro-Bold' : 'sans-serif' },
  ayahEndSymbol: { color: '#D4AF37' },
  
  // Şık Ayraç
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, opacity: 0.3 },
  dividerDot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 10, opacity: 0.3 },
  
  turkishText: { fontWeight: '400', opacity: 0.9, letterSpacing: 0.2 },
  
  // Alt Bar
  paginationBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderTopWidth: 1, elevation: 20, shadowColor: "#000", shadowOffset: {width: 0, height: -5}, shadowOpacity: 0.05 },
  pageButton: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)' },
  disabledButton: { opacity: 0.2 },
  pageInfo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  pageText: { fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },

  // AI BOX
  aiBox: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, borderWidth: 1, elevation: 1, marginTop: 10, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5 },
  aiBoxLeft: { marginRight: 15 },
  aiIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  aiBoxCenter: { flex: 1 },
  aiTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  aiQuestion: { fontSize: 13, fontWeight: '400', opacity: 0.7 },

  // AYARLAR MODALI
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  settingsContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: 50 },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  settingsTitle: { fontSize: 22, fontWeight: '800' },
  closeBtn: { backgroundColor: 'rgba(0,0,0,0.05)', padding: 8, borderRadius: 20 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingLabel: { fontSize: 16, fontWeight: '600' },
  controlGroup: { flexDirection: 'row', alignItems: 'center' },
  controlBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  controlText: { fontSize: 18, fontWeight: 'bold', width: 46, textAlign: 'center' },
});