import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, 
  ActivityIndicator, Linking, Platform, SafeAreaView, StatusBar, Image, Dimensions 
} from 'react-native';
import * as Location from 'expo-location';
import { ChevronLeft, MapPin, Navigation, Sparkles, MessageCircle, HelpCircle, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import axios from 'axios';

const { width, height } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (width - 40 - CARD_GAP) / 2;

const mosqueImage = require('../../assets/mosque.png');

const SERVERS = [
  process.env.EXPO_PUBLIC_OVERPASS_MAIN, 
  process.env.EXPO_PUBLIC_OVERPASS_BACKUP
];

export default function MosqueScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const [location, setLocation] = useState(null);
  const [mosques, setMosques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Konum izni reddedildi. Yakındaki camileri gösterebilmemiz için konum bilgisi gerekli dostum.');
        setLoading(false);
        return;
      }

      try {
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
        fetchNearbyMosques(loc.coords.latitude, loc.coords.longitude);
      } catch (e) {
        setErrorMsg("Konum bilgisine ulaşılamadı. GPS'in açık olduğundan emin misin?");
        setLoading(false);
      }
    })();
  }, []);

  const fetchNearbyMosques = async (lat, lon) => {
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="place_of_worship"]["religion"="muslim"](around:3000, ${lat}, ${lon});
        way["amenity"="place_of_worship"]["religion"="muslim"](around:3000, ${lat}, ${lon});
      );
      out center;
    `;

    let success = false;
    for (const server of SERVERS) {
      if (success || !server) break;
      try {
        const response = await axios.get(`${server}?data=${encodeURIComponent(query)}`, { timeout: 15000 });
        const data = response.data.elements.map((item) => {
          let name = item.tags.name || item.tags.alt_name || "Mescit / Cami"; 
          return {
            id: item.id,
            name: name,
            lat: item.lat || item.center.lat,
            lon: item.lon || item.center.lon,
            image: mosqueImage 
          };
        });

        const sortedData = data.map(m => ({
          ...m,
          distance: getDistanceFromLatLonInKm(lat, lon, m.lat, m.lon)
        })).sort((a, b) => a.distance - b.distance);

        setMosques(sortedData);
        success = true; 
        setLoading(false);
      } catch (err) {
        console.log(`Sunucu hatası:`, err.message);
      }
    }

    if (!success) {
      setErrorMsg("Sistemlerimizde geçici bir yoğunluk var. Lütfen biraz sonra tekrar dene güzel dostum.");
      setLoading(false);
    }
  };

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    var R = 6371; 
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  }

  const deg2rad = (deg) => deg * (Math.PI / 180);

  const openMap = (lat, lon, label) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lon}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    Linking.openURL(url);
  };

  const startAIChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('ChatScreen', { 
      initialMessage: "Selam Yoldaş! Camilerin İslam medeniyetindeki ve toplum hayatındaki birleştirici gücü hakkında bize neler anlatabilirsin?" 
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.gridCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => openMap(item.lat, item.lon, item.name)}
      activeOpacity={0.9}
    >
      <View style={styles.cardImageContainer}>
        <Image source={item.image} style={styles.cardImage} />
        <View style={[styles.distanceBadge, { backgroundColor: theme.primary }]}>
          <Text style={styles.distanceText}>{item.distance.toFixed(1)} km</Text>
        </View>
      </View>

      <View style={styles.cardInfo}>
        <Text style={[styles.mosqueName, { color: theme.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        
        <View style={[styles.navButton, { backgroundColor: theme.primary + '15' }]}>
            <Navigation size={14} color={theme.primary} fill={theme.primary + '20'} />
            <Text style={[styles.navButtonText, { color: theme.primary }]}>Yol Tarifi</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 25) + 10 : 0 }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: theme.card }]}>
          <ChevronLeft size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Yakındaki Camiler</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.subText }]}>Mescitler aranıyor...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.center}>
          <Text style={{ color: theme.subText, textAlign: 'center', marginBottom: 25, fontSize: 16, paddingHorizontal: 40 }}>{errorMsg}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={() => {
                setLoading(true);
                setErrorMsg(null);
                (async () => {
                    try {
                        let loc = await Location.getCurrentPositionAsync({});
                        fetchNearbyMosques(loc.coords.latitude, loc.coords.longitude);
                    } catch {
                        setErrorMsg("Konum alınamadı.");
                        setLoading(false);
                    }
                })();
            }}
          >
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={mosques}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: theme.subText }}>Yakınlarda cami bulunamadı. (3km)</Text>
            </View>
          }
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
                    <Text style={[styles.aiTitle, { color: theme.text }]}>Mescit Adabı ve Maneviyatı</Text>
                    <Text style={[styles.aiQuestion, { color: theme.subText }]} numberOfLines={1}>
                        "Caminin toplumdaki gücü nedir?"
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
  header: { 
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
      paddingHorizontal: 20, paddingBottom: 15
  },
  headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  backBtn: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 15, fontSize: 15, fontWeight: '600' },

  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  columnWrapper: { justifyContent: 'space-between' },

  gridCard: {
    width: CARD_WIDTH,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden', 
    elevation: 8, 
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }
  },
  cardImageContainer: { position: 'relative' },
  cardImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0'
  },
  distanceBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  distanceText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  
  cardInfo: { padding: 14 },
  mosqueName: { fontSize: 15, fontWeight: '800', marginBottom: 10, height: 40, lineHeight: 20 }, 
  navButton: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    paddingVertical: 8, borderRadius: 12 
  },
  navButtonText: { fontSize: 12, fontWeight: '700', marginLeft: 6 },
  
  retryButton: { paddingHorizontal: 30, paddingVertical: 15, borderRadius: 18, elevation: 4 },
  retryButtonText: { color: '#FFF', fontWeight: '800', fontSize: 16 },

  // AI BOX
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