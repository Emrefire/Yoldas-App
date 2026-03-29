import React, { useState, useRef } from 'react';
import { 
  StyleSheet, Text, View, FlatList, Pressable, 
  SafeAreaView, TextInput, StatusBar, Animated, Easing, Platform, Dimensions
} from 'react-native';
import { Heart, BookOpen, Star, Feather, Search, Award } from 'lucide-react-native'; 
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext'; 
import { libraryCategories } from '../database/libraryData';

// 🔥 REKLAM KÜTÜPHANESİ EKLENDİ
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// 💡 Geliştirme aşamasında test reklamı, canlıya çıkarken kendi Banner ID'ni buraya yazacaksın.
const adUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-7784699073373527/7030435714'; 

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (width - 40 - CARD_GAP) / 2;
const CARD_HEIGHT = 170; 

const iconMap = {
  heart: Heart,
  'book-open': BookOpen,
  star: Star,
  feather: Feather,
  award: Award
};

// ÖZEL KART 1: ECDADIN MİRASI
const HERITAGE_CARD = {
    id: 'heritage_special',
    title: 'Ecdadın Mirası',
    subtitle: 'Tarihimiz ve Camilerimiz 🕌',
    icon: 'feather', 
    color: '#D4AF37', 
    type: 'special_redirect', 
    screen: 'Heritage'
};

// ÖZEL KART 2: BİLGİ YARIŞMASI
const QUIZ_CARD = {
    id: 'quiz_special',
    title: 'Bilgi Yarışması',
    subtitle: 'Dini Bilgini Test Et 🏆',
    icon: 'award', 
    color: '#FF6B6B', 
    type: 'special_redirect', 
    screen: 'Quiz' 
};

const LibraryCard = ({ item, theme, isDarkMode }) => {
  const navigation = useNavigation();
  const IconComponent = iconMap[item.icon] || BookOpen;

  const fillAnim = useRef(new Animated.Value(0)).current; 
  const scaleAnim = useRef(new Animated.Value(1)).current; 
  
  const bubble1 = useRef(new Animated.Value(0)).current;
  const bubble2 = useRef(new Animated.Value(0)).current;
  const bubble3 = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.timing(fillAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true, 
      easing: Easing.out(Easing.circle),
    }).start();

    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true, 
    }).start();

    const createBubbleAnim = (anim, duration, delay) => {
      anim.setValue(0);
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: duration,
            useNativeDriver: true,
            easing: Easing.linear
          })
        ])
      );
    };

    createBubbleAnim(bubble1, 1000, 0).start();
    createBubbleAnim(bubble2, 1200, 400).start();
    createBubbleAnim(bubble3, 800, 200).start();
  };

  const handlePressOut = () => {
    Animated.timing(fillAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true, 
    }).start();

    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    bubble1.stopAnimation();
    bubble2.stopAnimation();
    bubble3.stopAnimation();
  };

  const handlePress = () => {
    if (item.type === 'special_redirect') {
        navigation.navigate(item.screen);
    } else {
        navigation.navigate('LibraryDetail', { 
            categoryId: item.id, 
            categoryTitle: item.title,
            type: item.type 
        });
    }
  };

  const fillTranslateY = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CARD_HEIGHT, 0] 
  });

  const getBubbleStyle = (anim, leftPos) => ({
    position: 'absolute',
    bottom: -20,
    left: leftPos,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.4)',
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -200] }) },
      { scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.2, 0] }) }
    ],
    opacity: fillAnim 
  });

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={{ width: CARD_WIDTH, marginBottom: 16 }}
    >
      <Animated.View 
        style={[
          styles.gridCard, 
          { 
            backgroundColor: theme.card,
            borderColor: theme.border,
            shadowColor: isDarkMode ? '#000' : item.color,
            transform: [{ scale: scaleAnim }],
            height: CARD_HEIGHT, 
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.fillLayer, 
            { 
              backgroundColor: item.color, 
              opacity: 0.2,
              height: '150%', 
              transform: [{ translateY: fillTranslateY }]
            } 
          ]} 
        />

        <Animated.View style={getBubbleStyle(bubble1, '20%')} />
        <Animated.View style={getBubbleStyle(bubble2, '50%')} />
        <Animated.View style={getBubbleStyle(bubble3, '80%')} />

        <Animated.View 
           style={[
             styles.bottomLine, 
             { 
               backgroundColor: item.color,
               opacity: fillAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) 
             }
           ]} 
        />

        <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
          <IconComponent size={28} color={item.color} />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{item.title}</Text>
          <Text style={[styles.cardSubtitle, { color: theme.subText }]} numberOfLines={3}>
            {item.subtitle || 'İçerikleri keşfet'}
          </Text>
        </View>

      </Animated.View>
    </Pressable>
  );
};

export default function LibraryScreen() {
  const navigation = useNavigation();
  const { theme, isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  
  const allCategories = [HERITAGE_CARD, QUIZ_CARD, ...libraryCategories];

  const filteredCategories = allCategories.filter(cat => 
    cat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 25) + 10 : 0 }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Kütüphane</Text>
          <Text style={[styles.headerSubtitle, { color: theme.subText }]}>İlim ve Hikmet Kapısı 📚</Text>
        </View>
      </View>

      <View style={[styles.searchWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Search size={20} color={theme.subText} style={{ marginLeft: 10 }} />
        <TextInput 
          placeholder="Kategori, dua veya sure ara..." 
          placeholderTextColor={theme.subText}
          style={[styles.searchInput, { color: theme.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredCategories}
        renderItem={({ item }) => (
          <LibraryCard item={item} theme={theme} isDarkMode={isDarkMode} />
        )}
        keyExtractor={item => item.id}
        numColumns={2} 
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.subText }]}>
              "{searchQuery}" ile ilgili bir şey bulamadık. 😔
            </Text>
          </View>
        }
      />

      {/* 🔥 REKLAM ALANI BURADA */}
      <View style={[styles.adContainer, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, marginBottom: 20
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 4, fontWeight: '500' },
  searchWrapper: { 
    flexDirection: 'row', alignItems: 'center', 
    marginHorizontal: 20, marginBottom: 20,
    height: 50, borderRadius: 16, borderWidth: 1
  },
  searchInput: { flex: 1, paddingHorizontal: 10, fontSize: 16, fontWeight: '500' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 }, // Reklam alanı eklendiği için paddingBottom düşürüldü
  columnWrapper: { justifyContent: 'space-between' },
  
  gridCard: {
    width: '100%', 
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    overflow: 'hidden', 
    position: 'relative'
  },
  fillLayer: {
    position: 'absolute', 
    left: 0, 
    right: 0, 
    top: 0, 
    zIndex: 0, 
  },
  iconCircle: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, zIndex: 1
  },
  textContainer: { flex: 1, zIndex: 1, width: '100%' },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  cardSubtitle: { fontSize: 12, lineHeight: 16, opacity: 0.8 },
  bottomLine: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, opacity: 0.8, zIndex: 1
  },
  emptyContainer: { alignItems: 'center', marginTop: 50, paddingHorizontal: 40 },
  emptyText: { textAlign: 'center', fontSize: 16, lineHeight: 24 },

  // 🔥 REKLAM ALANI STİLİ
  adContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 5,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0 // iPhone'ların alt çentiği için pay
  }
});