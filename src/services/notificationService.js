import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import functions from '@react-native-firebase/functions';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
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
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("🧹 [Sistem] Eski bildirimler temizlendi.");

    const notifyOnTimeStr = await AsyncStorage.getItem('notifyOnTime');
    const notifyOnTime = notifyOnTimeStr !== null ? JSON.parse(notifyOnTimeStr) : true;
    
    const notifyPreAlertsStr = await AsyncStorage.getItem('notifyPreAlerts'); 
    const notifyPreAlerts = notifyPreAlertsStr !== null ? JSON.parse(notifyPreAlertsStr) : true;

    const selectedSound = await AsyncStorage.getItem('userNotificationSound') || 'default';
    const soundFile = selectedSound === 'default' ? 'default' : `${selectedSound}.wav`;
    const androidChannelId = selectedSound; 

    if (!notifyOnTime) return;

    const now = new Date();
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

      // Saati API'den temiz bir şekilde çekiyoruz
      const [hourStr, minuteStr] = timeStr.split(' ')[0].split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      let targetDate = new Date();
      targetDate.setHours(hour, minute, 0, 0);

      // Saniye veya dakika kaymasını önlemek için direkt tarihi manipüle ediyoruz
      if (p.offset !== 0) {
        targetDate.setMinutes(targetDate.getMinutes() + p.offset);
      }

      // Eğer hesaplanan vakit geçmişteyse, yarına kur
      if (targetDate.getTime() <= (now.getTime() + SAFETY_BUFFER)) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      // Vakte 2 dakikadan fazla varsa kur (Hemen şimdi çalmasını engellemek için)
      if (targetDate.getTime() > now.getTime() + 120000) {
        let finalMsg = p.msg;

        // 🔥 YAPAY ZEKA KONTROLÜ VE ZAMAN AŞIMI (TIMEOUT)
        if (p.offset === -45 && (p.type === 'Sahur' || p.type === 'İftar')) {
          try {
            const askYoldas = functions().httpsCallable('askYoldas');
            
            // AI için maksimum 5 saniye bekleriz. Gelmezse sistemi tıkamaz, devam eder.
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI_TIMEOUT')), 5000));
            const aiPromise = askYoldas({ prompt: `${p.type} vaktine 45 dakika kaldı. Bana çok kısa, samimi ve manevi bir hatırlatma yaz. (Tek cümle)` });
            
            const result = await Promise.race([aiPromise, timeoutPromise]);
            finalMsg = result.data.answer;
          } catch (e) {
            finalMsg = p.type === 'Sahur' ? "Bereket vakti yaklaşıyor can kardeşim." : "İftar sevinci yaklaşıyor aziz dostum.";
          }
        } else if (p.offset === -45) {
          finalMsg = "Vaktin girmesine 45 dk kaldı, hazırlıkları tamamlayalım mı? 😊";
        }

        const uniqueId = `${p.key}_${p.offset}_${targetDate.getDate()}`;

        // 🔥 KRİTİK DEĞİŞİKLİK: Saniye hesabı (TIME_INTERVAL) yerine TAM TARİH (DATE) kullanıyoruz
        await Notifications.scheduleNotificationAsync({
          identifier: uniqueId,
          content: {
            title: p.title,
            body: finalMsg,
            sound: soundFile, 
            color: '#2D5A27',
            android: {
                channelId: androidChannelId, 
                priority: 'max',
                sound: true 
            },
          },
          trigger: {
            // "Şu andan X saniye sonra" DEĞİL, "Tam olarak şu saatte/tarihte" demek. Asla şaşmaz.
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: targetDate, 
            channelId: androidChannelId, 
          },
        });
        
        scheduledCount++;
      }
    }
    console.log(`✅ İşlem tamam. Toplam ${scheduledCount} bildirim tam vaktine kuruldu. Seçilen Ses: ${androidChannelId}`);
  } catch (error) {
    console.log("❌ Planlama hatası:", error);
  }
}

export async function scheduleRamadanAlerts(vakitler) {
    console.log("Ramazan alarmları ana fonksiyona dahil edildi.");
}