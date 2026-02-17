import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Native Functions importunu kullanıyoruz (App Check uyumlu olsun diye)
import functions from '@react-native-firebase/functions';

// Android için bildirimlerin nasıl görüneceği ayarı
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  // İzinleri kontrol et
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }
  return true;
}

export async function scheduleAllPrayerNotifications(vakitler) {
  try {
    // Önce eski planlanmışları temizle
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("🧹 [Sistem] Eski bildirimler temizlendi.");

    // 1. AYARLARI ÇEK
    const notifyOnTimeStr = await AsyncStorage.getItem('notifyOnTime');
    const notifyOnTime = notifyOnTimeStr !== null ? JSON.parse(notifyOnTimeStr) : true;
    
    const notifyPreAlertsStr = await AsyncStorage.getItem('notifyPreAlerts'); 
    const notifyPreAlerts = notifyPreAlertsStr !== null ? JSON.parse(notifyPreAlertsStr) : true;

    // 🔥 SES SEÇİMİNİ AL
    const selectedSound = await AsyncStorage.getItem('userNotificationSound') || 'default';
    
    // iOS İçin Dosya Adı:
    const soundFile = selectedSound === 'default' ? 'default' : `${selectedSound}.wav`;
    
    // 🔥 ANDROID İÇİN KANAL ID'Sİ (App.js'de kurduğumuz kanallarla eşleşmeli)
    // Eğer 'default' ise 'default' kanalını, 'ney' ise 'ney' kanalını kullanacak.
    const androidChannelId = selectedSound; 

    if (!notifyOnTime) return;

    const now = new Date();
    const nowTime = now.getTime();
    const SAFETY_BUFFER = 2 * 60 * 1000; 

    const prayerConfig = [
      { key: 'Fajr', title: 'İmsak Vakti 🕌', msg: 'Sabah namazı vakti girdi. Haydi namaza.' },
      { key: 'Dhuhr', title: 'Öğle Ezanı 🕌', msg: 'Öğle namazı vakti girdi.' },
      { key: 'Asr', title: 'İkindi Ezanı 🕌', msg: 'İkindi namazı vakti girdi.' },
      { key: 'Maghrib', title: 'Akşam Ezanı 🕌', msg: 'Akşam namazı vakti girdi. İftar vakti!' },
      { key: 'Isha', title: 'Yatsı Ezanı 🕌', msg: 'Yatsı namazı vakti girdi. Günü ibadetle taçlandır.' },
    ];

    const preAlertConfig = [
      { key: 'Fajr', title: 'Sahura 45 Dakika! 🌙', type: 'Sahur' },
      { key: 'Maghrib', title: 'İftara 45 Dakika! 🌅', type: 'İftar' },
      { key: 'Dhuhr', title: 'Öğle Vaktine 45 Kaldı 🌿', type: 'Maneviyat' },
      { key: 'Asr', title: 'İkindiye 45 Kaldı 🌿', type: 'Maneviyat' },
      { key: 'Isha', title: 'Yatsıya 45 Kaldı 🌿', type: 'Maneviyat' },
    ];

    let scheduledCount = 0;
    const allConfigs = [
      ...prayerConfig.map(c => ({ ...c, offset: 0 })), 
      ...preAlertConfig.map(c => ({ ...c, offset: -45 }))
    ];

    for (let p of allConfigs) {
      if (p.offset === -45 && !notifyPreAlerts) continue;

      let timeStr = vakitler[p.key]; 
      if (!timeStr) continue;

      const [hour, minute] = timeStr.replace(/[^0-9:]/g, '').split(':').map(Number);
      let targetDate = new Date();
      targetDate.setHours(hour, minute, 0, 0);

      if (p.offset !== 0) targetDate.setMinutes(targetDate.getMinutes() + p.offset);
      if (targetDate.getTime() <= (nowTime + SAFETY_BUFFER)) targetDate.setDate(targetDate.getDate() + 1);

      const diffInSeconds = Math.floor((targetDate.getTime() - nowTime) / 1000);

      if (diffInSeconds > 120) {
        let finalMsg = p.msg;

        // 45 dk kala AI mesajı (Native Functions ile)
        if (p.offset === -45 && (p.type === 'Sahur' || p.type === 'İftar')) {
          try {
            const askYoldas = functions().httpsCallable('askYoldas');
            const result = await askYoldas({ 
              prompt: `${p.type} vaktine 45 dakika kaldı. Bana çok kısa, samimi ve manevi bir hatırlatma yaz. (Tek cümle)` 
            });
            finalMsg = result.data.answer;
          } catch (e) {
            finalMsg = p.type === 'Sahur' ? "Bereket vakti yaklaşıyor can kardeşim." : "İftar sevinci yaklaşıyor aziz dostum.";
          }
        } else if (p.offset === -45) {
          finalMsg = "Vaktin girmesine 45 dk kaldı, hazırlıkları tamamlayalım mı? 😊";
        }

        const uniqueId = `${p.key}_${p.offset}_${targetDate.getDate()}`;
        
        // AI gecikmesi ihtimaline karşı minik buffer
        await new Promise(resolve => setTimeout(resolve, 200)); 

        await Notifications.scheduleNotificationAsync({
          identifier: uniqueId,
          content: {
            title: p.title,
            body: finalMsg,
            sound: soundFile, // iOS için dosya adı
            color: '#2D5A27',
            // 🔥 KRİTİK DÜZELTME: Kanal ID'si dinamik seçiliyor
            android: {
                channelId: androidChannelId, 
                priority: 'max',
                sound: true // Kanalın sesini kullan
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: diffInSeconds,
            channelId: androidChannelId, // Android 8.0+ için trigger'da da kanal belirtmek iyidir
            repeats: false,
          },
        });
        
        scheduledCount++;
      }
    }
    console.log(`✅ İşlem tamam. Toplam ${scheduledCount} bildirim kuruldu. Ses: ${androidChannelId}`);
  } catch (error) {
    console.log("❌ Planlama hatası:", error);
  }
}

// Bu fonksiyonu başka yerden çağırıyorsan buraya ekle, yoksa silebilirsin
export async function scheduleRamadanAlerts(vakitler) {
    // Yukarıdaki fonksiyon zaten hepsini kapsıyor (offset -45 olanlar)
    // O yüzden burası boş kalabilir veya özel bir mantık varsa eklenir.
    console.log("Ramazan alarmları ana fonksiyona dahil edildi.");
}