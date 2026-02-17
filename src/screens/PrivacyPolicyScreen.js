import React from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  SafeAreaView, Platform, StatusBar, Linking 
} from 'react-native';
import { ChevronLeft, ShieldCheck, ExternalLink } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  const { theme, isDarkMode } = useTheme();

  // 🔴 BURAYA SİTEDEN ALDIĞIN LİNKİ YAPIŞTIR
// 👇 Senin oluşturduğun Google Docs linkini buraya koyduk
const POLICY_URL = "https://docs.google.com/document/d/15LeLTMcl9zLOd8_8VgBS2T5g3EU--zae488bvZQEOAo/edit?usp=sharing";
  const openFullPolicy = () => {
    Linking.openURL(POLICY_URL).catch(err => console.error("Link açılamadı", err));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 25) + 10 : 0 }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Gizlilik Politikası</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primary + '15' }]}>
             <ShieldCheck size={64} color={theme.primary} />
          </View>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Verileriniz Bize Emanet</Text>
        
        <Text style={[styles.text, { color: theme.subText }]}>
          Yoldaş uygulaması olarak gizliliğinize büyük önem veriyoruz. Hangi verileri neden kullandığımızı şeffafça açıklıyoruz:
        </Text>

        {/* 1. Konum */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
             <Text style={styles.emoji}>📍</Text>
             <Text style={[styles.sectionTitle, { color: theme.text }]}>1. Konum (GPS) Verisi</Text>
          </View>
          <Text style={[styles.sectionText, { color: theme.subText }]}>
            Namaz vakitlerini, iftar saatini ve kıble yönünü doğru hesaplayabilmek için anlık konumunuz kullanılır. 
            {"\n\n"}
            ⚠️ <Text style={{fontWeight:'bold', color: theme.primary}}>Önemli:</Text> Konum verileriniz sadece telefonunuzda işlenir. Sunucularımıza kaydedilmez, takip edilmez ve üçüncü şahıslarla paylaşılmaz.
          </Text>
        </View>

        {/* 2. Reklamlar */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
             <Text style={styles.emoji}>📢</Text>
             <Text style={[styles.sectionTitle, { color: theme.text }]}>2. Reklamlar</Text>
          </View>
          <Text style={[styles.sectionText, { color: theme.subText }]}>
            Uygulamanın ücretsiz kalabilmesi için Google AdMob aracılığıyla reklamlar gösterilir. Reklam sağlayıcıları, size daha uygun reklamlar sunmak için cihaz kimliği gibi bazı anonim verileri kullanabilir.
          </Text>
        </View>

        {/* 3. Ödemeler */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
             <Text style={styles.emoji}>💳</Text>
             <Text style={[styles.sectionTitle, { color: theme.text }]}>3. Ödemeler</Text>
          </View>
          <Text style={[styles.sectionText, { color: theme.subText }]}>
            Reklamları kaldırmak için yapacağınız ödemeler (In-App Purchase), tamamen Google Play Store veya Apple App Store güvencesiyle işlenir. Kredi kartı bilgilerinizi biz göremeyiz.
          </Text>
        </View>

        <TouchableOpacity style={[styles.linkButton, { backgroundColor: theme.primary }]} onPress={openFullPolicy}>
            <Text style={styles.linkButtonText}>Tam Metni Oku (Web)</Text>
            <ExternalLink size={16} color="#FFF" style={{marginLeft: 8}} />
        </TouchableOpacity>

        <Text style={[styles.footer, { color: theme.subText }]}>
          Son Güncelleme: 17 Şubat 2026
        </Text>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1 
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  
  content: { padding: 20 },
  
  iconContainer: { alignItems: 'center', marginBottom: 25, marginTop: 10 },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center',
  },
  
  title: { fontSize: 24, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  text: { fontSize: 16, marginBottom: 25, lineHeight: 24, textAlign: 'center', marginHorizontal: 10 },
  
  card: { 
    padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 20,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  emoji: { fontSize: 20, marginRight: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionText: { fontSize: 15, lineHeight: 22 },
  
  linkButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      padding: 16, borderRadius: 16, marginTop: 10, marginBottom: 20
  },
  linkButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  footer: { textAlign: 'center', marginTop: 10, fontSize: 13, opacity: 0.6, fontWeight: '600' }
});