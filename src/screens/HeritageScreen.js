import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, SafeAreaView, 
  TouchableOpacity, Image, Modal, Platform, StatusBar, Dimensions, Share 
} from 'react-native';
import { MapPin, X, BookOpen, Share2, ChevronRight, Landmark, Sparkles, MessageCircle, HelpCircle, ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

// 🔥 YEREL VERİ HAVUZU
import { HERITAGE_LIST } from '../database/heritageData';

const { width, height } = Dimensions.get('window');

export default function HeritageScreen() {
  const navigation = useNavigation();
  const { theme, isDarkMode } = useTheme();
  
  const [selectedMosque, setSelectedMosque] = useState(null);

  const openDetails = (mosque) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMosque(mosque);
  };

  const closeDetails = () => {
    setSelectedMosque(null);
  };

  // 🔥 PAYLAŞMA FONKSİYONU
  const onShare = async (mosque) => {
    try {
      const result = await Share.share({
        message: `${mosque.title}\n📍 ${mosque.location}\n🏗 Mimar: ${mosque.architect}\n\n"${mosque.shortDesc}"\n\nEcdadımızın mirasını Yoldaş uygulaması ile keşfedin! 🕌✨`,
      });
      if (result.action === Share.sharedAction) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  // 🔥 ÖRNEK SORU ÜRETİCİ (MODAL İÇİN)
  const getSuggestedQuestion = (mosque) => {
    const questions = {
      1: `Ayasofya'daki 'terleyen sütun'un hikayesini ve manevi sırrını anlatır mısın?`,
      2: `Süleymaniye Camii'ndeki 'İs Odası' dehası hakkında bilgi verir misin?`,
      3: `Sultanahmet Camii'nin neden 6 minareli yapıldığının hikayesi nedir?`,
      4: `Selimiye Camii'ndeki o meşhur 'Ters Lale' motifinin gerçek hikayesi nedir?`,
      5: `Bursa Ulu Camii'nin içindeki şadırvanın manevi anlamı nedir?`,
      6: `Ortaköy Camii'nin deniz üzerindeki eşsiz mimarisinin sırrı nedir?`,
      7: `Divriği Ulu Camii'ndeki 'namaz kılan insan silüeti' nasıl oluşuyor?`
    };
    return questions[mosque.id] || `${mosque.title} hakkında bilinmeyen bir sır anlatır mısın?`;
  };

  // 🔥 AI CHAT YÖNLENDİRME (MODAL İÇİN)
  const startAIChat = (mosque) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const question = `Selam Yoldaş! ${getSuggestedQuestion(mosque)}`;
    closeDetails(); 
    navigation.navigate('ChatScreen', { initialMessage: question });
  };

  // 🔥 GENEL MİMARİ SOHBET (ANA LİSTE İÇİN)
  const startGeneralArchChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('ChatScreen', { 
      initialMessage: "Selam Yoldaş! Ecdadımızın taşları adeta birer dua gibi işlemesinin, o muazzam mimari estetiğin arkasındaki manevi sır nedir? Bize ecdat mirasının ruhundan bahseder misin?" 
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 25) + 10 : 0 }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: theme.card }]}>
          <ChevronLeft size={28} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', marginRight: 44 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Ecdadın Mirası</Text>
          <Text style={[styles.headerSubtitle, { color: theme.subText }]}>Taşa Ruh Üfleyen Medeniyet 🕌</Text>
        </View>
      </View>

      {/* LİSTE */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {HERITAGE_LIST.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            activeOpacity={0.9}
            onPress={() => openDetails(item)}
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={styles.imageContainer}>
                <Image source={item.image} style={styles.cardImage} resizeMode="cover" />
                <View style={styles.locationBadge}>
                    <MapPin size={12} color="#FFF" />
                    <Text style={styles.locationBadgeText}>{item.location}</Text>
                </View>
            </View>
            
            <View style={styles.cardContent}>
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.yearBadge, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[styles.yearText, { color: theme.primary }]}>{item.year}</Text>
                </View>
              </View>
              
              <View style={styles.architectRow}>
                <Landmark size={14} color={theme.primary} />
                <Text style={[styles.architectText, { color: theme.subText }]}>{item.architect}</Text>
              </View>

              <Text style={[styles.shortDesc, { color: theme.text }]} numberOfLines={2}>{item.shortDesc}</Text>

              <View style={styles.readMoreRow}>
                 <Text style={[styles.readMoreText, { color: theme.primary }]}>Hikayesini Oku</Text>
                 <ChevronRight size={16} color={theme.primary} />
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* 🔥 ANA LİSTE AI PROMPT BOX */}
        <TouchableOpacity 
            style={[styles.mainAiBox, { backgroundColor: theme.primary }]} 
            onPress={startGeneralArchChat} 
            activeOpacity={0.8}
        >
            <View style={styles.aiBoxHeader}>
                <View style={styles.aiIconCircle}>
                    <Sparkles size={18} color={theme.primary} fill={theme.primary} />
                </View>
                <Text style={styles.mainAiTitle}>Mimari Sırları Sor</Text>
            </View>
            <View style={styles.mainAiQuestionContainer}>
                <HelpCircle size={14} color="#FFF" />
                <Text style={styles.mainAiQuestion}>"Taşın duaya dönüşme hikayesini anlat..."</Text>
            </View>
            <View style={styles.mainAiFooter}>
                <MessageCircle size={14} color="#FFF" />
                <Text style={styles.mainAiLink}>Yoldaş'a Sor</Text>
            </View>
        </TouchableOpacity>

        <View style={{ height: 100 }} /> 
      </ScrollView>

      {/* DETAY MODALI */}
      <Modal visible={!!selectedMosque} animationType="slide" transparent={false} onRequestClose={closeDetails}>
        {selectedMosque && (
          <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
            <TouchableOpacity style={styles.closeButtonOverlay} onPress={closeDetails}>
                <View style={styles.closeButtonBlur}><X size={24} color="#FFF" /></View>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <Image source={selectedMosque.image} style={styles.modalImage} resizeMode="cover" />
              
              <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>{selectedMosque.title}</Text>
                    <TouchableOpacity 
                        style={[styles.shareButton, { backgroundColor: theme.primary + '15' }]}
                        onPress={() => onShare(selectedMosque)}
                    >
                        <Share2 size={22} color={theme.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <MapPin size={18} color={theme.primary} />
                        <Text style={[styles.infoText, { color: theme.subText }]}>{selectedMosque.location}</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <View style={styles.infoItem}>
                        <BookOpen size={18} color={theme.primary} />
                        <Text style={[styles.infoText, { color: theme.subText }]}>{selectedMosque.architect}</Text>
                    </View>
                </View>

                <View style={[styles.separator, { backgroundColor: theme.border }]} />

                <Text style={[styles.sectionHeader, { color: theme.text }]}>Eserin Hikayesi</Text>
                <Text style={[styles.fullDesc, { color: theme.text }]}>{selectedMosque.fullDesc}</Text>

                {/* MODAL İÇİ AI KUTUSU */}
                <TouchableOpacity 
                    style={[styles.aiBoxModal, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF', borderColor: theme.border }]}
                    onPress={() => startAIChat(selectedMosque)}
                    activeOpacity={0.9}
                >
                    <View style={styles.modalAiHeader}>
                        <View style={[styles.modalAiIconCircle, { backgroundColor: theme.primary }]}>
                            <Sparkles size={18} color="#FFF" fill="#FFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.modalAiTitle, { color: theme.text }]}>Eserin Sırrını Sor</Text>
                            <Text style={[styles.modalAiQuestion, { color: theme.subText }]} numberOfLines={1}>
                                "{getSuggestedQuestion(selectedMosque).substring(0, 40)}..."
                            </Text>
                        </View>
                        <ChevronRight size={20} color={theme.primary} />
                    </View>
                </TouchableOpacity>

                <View style={{ height: 60 }} />
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  backBtn: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  headerTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { borderRadius: 24, marginBottom: 20, overflow: 'hidden', borderWidth: 1, elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  imageContainer: { position: 'relative', width: '100%', height: 180 },
  cardImage: { width: '100%', height: '100%' },
  locationBadge: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  locationBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700', marginLeft: 4 },
  cardContent: { padding: 18 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 20, fontWeight: '800', flex: 1, marginRight: 10 },
  yearBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  yearText: { fontSize: 11, fontWeight: '800' },
  architectRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  architectText: { fontSize: 13, fontWeight: '600', marginLeft: 6 },
  shortDesc: { fontSize: 14, lineHeight: 22, marginBottom: 14, opacity: 0.9 },
  readMoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  readMoreText: { fontSize: 14, fontWeight: '800', marginRight: 4 },

  // ANA LİSTE AI BOX (Eylem Kartı)
  mainAiBox: { padding: 18, borderRadius: 24, elevation: 8, marginTop: 10 },
  aiBoxHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  aiIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  mainAiTitle: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  mainAiQuestionContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 16, marginBottom: 15 },
  mainAiQuestion: { color: '#FFF', fontSize: 14, fontWeight: '600', fontStyle: 'italic', marginLeft: 10, flex: 1 },
  mainAiFooter: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end' },
  mainAiLink: { color: '#FFF', fontSize: 13, fontWeight: '800', marginLeft: 6 },

  // MODAL STYLES
  modalContainer: { flex: 1 },
  modalImage: { width: width, height: height * 0.4, backgroundColor: '#222' },
  closeButtonOverlay: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, right: 20, zIndex: 100 },
  closeButtonBlur: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  modalContent: { marginTop: -35, borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, minHeight: height * 0.6 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: '900', flex: 1, marginRight: 15 },
  shareButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, justifyContent: 'space-between' },
  infoItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  infoText: { marginLeft: 10, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  divider: { width: 1, height: 24, marginHorizontal: 15 },
  separator: { height: 1, width: '100%', marginBottom: 20 },
  sectionHeader: { fontSize: 18, fontWeight: '900', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  fullDesc: { fontSize: 16, lineHeight: 28, opacity: 0.85, fontWeight: '500', textAlign: 'left', marginBottom: 25 },
  
  // MODAL İÇİ AI BOX
  aiBoxModal: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 24, borderWidth: 1, elevation: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  modalAiHeader: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  modalAiIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  modalAiTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  modalAiQuestion: { fontSize: 13, fontWeight: '500', fontStyle: 'italic' }
});