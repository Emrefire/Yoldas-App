import React, { useState, useCallback, useRef } from 'react';
import { 
  StyleSheet, Text, View, FlatList, SafeAreaView, TouchableOpacity, Platform, Dimensions, StatusBar
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Trash2, BookOpen, Quote, Share2 } from 'lucide-react-native'; 
import ViewShot from 'react-native-view-shot'; 
import { getFavorites, removeFavorite } from '../database/db';
import { shareAsImage } from '../services/shareService';
import { useTheme } from '../context/ThemeContext'; 

// 🔥 RESPONSIVE FONT AYARLARI
const { width } = Dimensions.get('window');
const IS_SMALL_SCREEN = width < 375;
const ARABIC_FONT_SIZE = IS_SMALL_SCREEN ? 22 : 26;
const TURKISH_FONT_SIZE = IS_SMALL_SCREEN ? 14 : 16;

export default function FavoritesScreen() {
  const { theme, isDarkMode } = useTheme(); 
  const [favs, setFavs] = useState([]);
  const viewRefs = useRef({}); 

  useFocusEffect(
    useCallback(() => {
      const data = getFavorites();
      setFavs(data);
    }, [])
  );

  const handleDelete = (id) => {
    removeFavorite(id);
    setFavs(getFavorites());
  };

  const renderItem = ({ item }) => {
    const surahName = item.surah_name || "Bilinmiyor";
    const arabicText = item.arabic_text || "";
    const turkishText = item.turkish_text || "İçerik bulunamadı";
    const ayahNumber = item.ayah_number ? `${item.ayah_number}. Ayet` : "";
    const isHadith = item.kategori_id === 'hadis';

    return (
      <View style={styles.cardWrapper}>
        <ViewShot 
          ref={(ref) => (viewRefs.current[item.id] = ref)} 
          options={{ format: 'png', quality: 0.9 }}
          style={[styles.card, { backgroundColor: theme.card }]} 
        >
          <View style={styles.cardHeader}>
            <View style={styles.tagContainer}>
              {isHadith ? 
                <Quote size={14} color={theme.primary} /> : 
                <BookOpen size={14} color={theme.primary} />
              }
              <Text style={[styles.surahTag, { color: theme.primary }]}>
                {isHadith ? "Günün Hadisi" : `${surahName} ${ayahNumber}`}
              </Text>
            </View>
          </View>

          {arabicText !== "" && (
            <Text style={[styles.arabicText, { color: theme.text, fontSize: ARABIC_FONT_SIZE, lineHeight: ARABIC_FONT_SIZE * 1.8 }]}>
              {arabicText}
            </Text>
          )}
          <Text style={[styles.turkishText, { color: theme.text, fontSize: TURKISH_FONT_SIZE }]}>
            {turkishText}
          </Text>
          
          {isHadith && (
            <Text style={[styles.sourceText, { color: theme.subText }]}>
              Kaynak: {surahName}
            </Text>
          )}
          
          <Text style={[styles.watermark, { color: theme.primary }]}>Yoldaş Uygulaması</Text>
        </ViewShot>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => shareAsImage(viewRefs.current[item.id])}
          >
            <Share2 size={18} color={theme.primary} />
            <Text style={[styles.actionBtnText, { color: theme.primary }]}>Paylaş</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => handleDelete(item.id)}
          >
            <Trash2 size={18} color="#FF3B30" />
            <Text style={[styles.actionBtnText, { color: '#FF3B30' }]}>Sil</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    // 🔥 SAFE AREA FIX: Android için extra padding
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 25) + 10 : 0 }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Favorilerim</Text>
      </View>
      <FlatList
        data={favs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.subText }]}>Henüz favori ayetiniz yok.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 25, paddingTop: 10, paddingBottom: 15 },
  title: { fontSize: 28, fontWeight: 'bold' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 }, // Alt menüye takılmasın diye ekstra boşluk
  cardWrapper: { marginBottom: 20 },
  card: { 
    borderRadius: 20, padding: 20,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  tagContainer: { flexDirection: 'row', alignItems: 'center' },
  surahTag: { fontWeight: 'bold', fontSize: 13, marginLeft: 8 },
  
  arabicText: { 
    textAlign: 'right', 
    writingDirection: 'rtl',
    marginBottom: 12, 
    fontFamily: Platform.OS === 'ios' ? 'GeezaPro-Bold' : 'sans-serif' 
  },
  
  turkishText: { lineHeight: 24 },
  sourceText: { fontSize: 12, marginTop: 10, fontStyle: 'italic' },
  watermark: { marginTop: 15, fontSize: 10, opacity: 0.4, textAlign: 'center', fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 20, padding: 5 },
  actionBtnText: { marginLeft: 6, fontSize: 14, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16 }
});