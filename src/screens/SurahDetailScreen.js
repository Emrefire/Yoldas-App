import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, ActivityIndicator, 
  SafeAreaView, TouchableOpacity, Platform, Animated, Dimensions, Alert, StatusBar
} from 'react-native';
import { ChevronLeft, ChevronRight, Heart, CheckCircle2, Sparkles, MessageCircle, ChevronRight as ChevronRightSmall } from 'lucide-react-native';
import { fetchSurahDetail } from '../services/apiService';
import { addFavorite, removeFavorite, isFavorite } from '../database/db';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
const IS_SMALL_SCREEN = width < 375;

const ARABIC_FONT_SIZE = IS_SMALL_SCREEN ? 26 : 32;
const TURKISH_FONT_SIZE = IS_SMALL_SCREEN ? 15 : 17;

const AYAH_PER_PAGE = 7; 

const toArabicNum = (num) => num.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

const cleanArabicText = (text, surahId, ayahNumber) => {
  if (Number(surahId) !== 1 && Number(surahId) !== 9 && ayahNumber === 1) {
    const bismillah = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
    return text.replace(bismillah, "").trim();
  }
  return text;
};

export default function SurahDetailScreen({ route, navigation }) {
  const { surahId, surahName, initialPage, initialAyah } = route.params;
  const { theme, isDarkMode } = useTheme();
  
  const [fullData, setFullData] = useState(null);
  const [currentPageData, setCurrentPageData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const scrollViewRef = useRef();

  const [showToast, setShowToast] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 🔥 AI CHAT TETİKLEYİCİ
  const startAIChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const initialMsg = `Selam Yoldaş! Şu an ${surahName} Suresi'nin ${currentPage}. sayfasını okuyorum. Bana bu sayfadaki ayetlerin genel mesajını ve manevi derinliğini kısaca anlatır mısın?`;
    navigation.navigate('ChatScreen', { initialMessage: initialMsg });
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true); 
        const result = await fetchSurahDetail(surahId);
        if (result) {
          setFullData(result);
          const total = Math.ceil(result.arabic.length / AYAH_PER_PAGE);
          setTotalPages(total);
          let startPage = 1;
          if (initialAyah) {
             const targetAyahIndex = result.arabic.findIndex(a => a.numberInSurah === initialAyah);
             if (targetAyahIndex !== -1) startPage = Math.floor(targetAyahIndex / AYAH_PER_PAGE) + 1;
          } else if (initialPage) {
             const targetAyahIndex = result.arabic.findIndex(a => Number(a.page) === Number(initialPage));
             if (targetAyahIndex !== -1) startPage = Math.floor(targetAyahIndex / AYAH_PER_PAGE) + 1;
          }
          loadPage(startPage, result);
          const favStatus = {};
          result.arabic.forEach((ayah) => {
            const num = ayah.numberInSurah || ayah.number; 
            const favId = `surah-${surahId}-${num}`;
            favStatus[favId] = isFavorite(favId);
          });
          setFavorites(favStatus);
        }
      } catch (error) { console.log(error); } finally { setLoading(false); }
    };
    init();
  }, [surahId]);

  const loadPage = (pageNo, sourceData = fullData) => {
    if (!sourceData) return;
    if (pageNo < 1) pageNo = 1;
    const maxPages = Math.ceil(sourceData.arabic.length / AYAH_PER_PAGE);
    if (pageNo > maxPages) pageNo = maxPages;
    const startIndex = (pageNo - 1) * AYAH_PER_PAGE;
    const endIndex = startIndex + AYAH_PER_PAGE;
    const combinedData = sourceData.arabic.slice(startIndex, endIndex).map((ayah, index) => ({
        ...ayah,
        turkishText: sourceData.turkish[startIndex + index] ? sourceData.turkish[startIndex + index].text : "",
        localIndex: ayah.numberInSurah,
        cleanText: cleanArabicText(ayah.text, surahId, ayah.numberInSurah)
    }));
    setCurrentPageData(combinedData);
    setCurrentPage(pageNo);
    if (scrollViewRef.current) scrollViewRef.current.scrollTo({ y: 0, animated: false });
  };

  const handleNextPage = () => { if (currentPage < totalPages) loadPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) loadPage(currentPage - 1); };

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
  const quranPage = referenceAyah ? referenceAyah.page : '-';
  const quranJuz = referenceAyah ? referenceAyah.juz : '-';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 25) + 5 : 0 }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}><ChevronLeft size={28} color={theme.text} /></TouchableOpacity>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={[styles.topInfoText, { color: theme.primary }]}>Cüz {quranJuz} • Sayfa {quranPage}</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{surahName}</Text>
        </View>
        <View style={styles.iconButton} />
      </View>

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {(currentPage === 1 && Number(surahId) !== 1 && Number(surahId) !== 9) && (
          <View style={[styles.bismillahContainer, { backgroundColor: theme.card }]}><Text style={[styles.bismillah, { color: theme.text }]}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</Text></View>
        )}

        {currentPageData.map((ayah) => {
          const isFav = favorites[`surah-${surahId}-${ayah.localIndex}`];
          return (
            <View key={ayah.localIndex} style={[styles.ayahCard, { backgroundColor: theme.card }]}>
              <TouchableOpacity style={styles.cardFavIcon} onPress={() => toggleFavorite(ayah)}>
                  <Heart size={20} color={isFav ? "#E74C3C" : theme.subText} fill={isFav ? "#E74C3C" : "transparent"} />
              </TouchableOpacity>
              <Text style={[styles.arabicText, { color: theme.text, fontSize: ARABIC_FONT_SIZE, lineHeight: ARABIC_FONT_SIZE * 1.8 }]}>
                {ayah.cleanText} {'\u00A0'} 
                <Text style={[styles.ayahEndSymbol, { fontSize: ARABIC_FONT_SIZE - 4 }]}>﴿{toArabicNum(ayah.localIndex)}﴾</Text>
              </Text>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Text style={[styles.turkishText, { color: theme.text, fontSize: TURKISH_FONT_SIZE }]}>{ayah.turkishText}</Text>
            </View>
          );
        })}

        {/* 🔥 SAYFA SONU AI TEFEKKÜR KUTUSU */}
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
                <Text style={[styles.aiTitle, { color: theme.text }]}>Bu Sayfayı Tefekkür Et</Text>
                <Text style={[styles.aiQuestion, { color: theme.subText }]} numberOfLines={1}>"Ayetlerin manevi derinliğini sor..."</Text>
            </View>
            <View style={styles.aiBoxRight}><ChevronRightSmall size={20} color={theme.primary} /></View>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* SAYFALAMA */}
      <View style={[styles.paginationBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableOpacity style={[styles.pageButton, currentPage === 1 && styles.disabledButton]} onPress={handlePrevPage} disabled={currentPage === 1}>
          <ChevronLeft size={24} color={currentPage === 1 ? theme.subText : theme.primary} />
          <Text style={[styles.pageBtnText, { color: currentPage === 1 ? theme.subText : theme.primary }]}>Önceki</Text>
        </TouchableOpacity>
        <View style={[styles.pageInfo, { backgroundColor: theme.background }]}><Text style={[styles.pageText, { color: theme.text }]}>{currentPage} / {totalPages}</Text></View>
        <TouchableOpacity style={[styles.pageButton, currentPage === totalPages && styles.disabledButton]} onPress={handleNextPage} disabled={currentPage === totalPages}>
          <Text style={[styles.pageBtnText, { color: currentPage === totalPages ? theme.subText : theme.primary }]}>Sonraki</Text>
          <ChevronRight size={24} color={currentPage === totalPages ? theme.subText : theme.primary} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  topInfoText: { fontSize: 12, fontWeight: '700', marginBottom: 4, opacity: 0.9, letterSpacing: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', width: '80%', textAlign: 'center' },
  iconButton: { padding: 8, width: 40, alignItems: 'center' },
  scrollContent: { padding: 16 },
  bismillahContainer: { padding: 15, borderRadius: 16, marginBottom: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  bismillah: { fontSize: 30, fontFamily: Platform.OS === 'ios' ? 'GeezaPro-Bold' : 'sans-serif', lineHeight: 50, textAlign: 'center' },
  ayahCard: { borderRadius: 16, padding: 20, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.03)', position: 'relative' },
  cardFavIcon: { position: 'absolute', top: 15, left: 15, zIndex: 10, padding: 5 },
  arabicText: { textAlign: 'right', writingDirection: 'rtl', marginTop: 25, marginBottom: 10, fontFamily: Platform.OS === 'ios' ? 'GeezaPro-Bold' : 'sans-serif' },
  ayahEndSymbol: { color: '#D4AF37' },
  divider: { height: 1, marginVertical: 12, opacity: 0.1 },
  turkishText: { lineHeight: 26, fontWeight: '400', opacity: 0.85 },
  paginationBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderTopWidth: 1, elevation: 20, shadowColor: "#000", shadowOffset: {width: 0, height: -5}, shadowOpacity: 0.05 },
  pageButton: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  pageBtnText: { fontSize: 15, fontWeight: '600', marginHorizontal: 6 },
  disabledButton: { opacity: 0.3 },
  pageInfo: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  pageText: { fontWeight: 'bold', fontSize: 13 },

  // AI BOX STYLES
  aiBox: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 24, borderWidth: 1, elevation: 4, marginTop: 10, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  aiBoxLeft: { marginRight: 15 },
  aiIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  aiBoxCenter: { flex: 1 },
  aiTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  aiQuestion: { fontSize: 13, fontWeight: '500', fontStyle: 'italic' },
  aiBoxRight: { marginLeft: 10 }
});