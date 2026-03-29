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

  return finalStatus === 'granted';
}

export async function scheduleAllPrayerNotifications(vakitler) {
 try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("🧹 [Sistem] Eski bildirimler temizlendi, yenileri ışık hızında kuruluyor...");

    const notifyOnTimeStr = await AsyncStorage.getItem('notifyOnTime');
    const notifyOnTime = notifyOnTimeStr !== null ? JSON.parse(notifyOnTimeStr) : true;
    
    const notifyPreAlertsStr = await AsyncStorage.getItem('notifyPreAlerts'); 
    const notifyPreAlerts = notifyPreAlertsStr !== null ? JSON.parse(notifyPreAlertsStr) : true;

    if (!notifyOnTime && !notifyPreAlerts) return;

    const selectedSound = await AsyncStorage.getItem('userNotificationSound') || 'default';
    const soundFile = selectedSound === 'default' ? null : `${selectedSound}.mp3`; 
    const androidChannelId = selectedSound === 'default' ? 'default' : selectedSound; 

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(androidChannelId, {
        name: 'Vakit Bildirimleri',
        importance: Notifications.AndroidImportance.MAX,
        sound: soundFile, 
        enableVibrate: true,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const SAFETY_BUFFER = 2 * 60 * 1000; 

    const prayerConfig = [
      { key: 'Fajr', title: 'İmsak Vakti 🕌', msg: 'Sabah namazı vakti girdi. Haydi felaha.' },
      { key: 'Dhuhr', title: 'Öğle Ezanı 🕌', msg: 'Öğle namazı vakti girdi.' },
      { key: 'Asr', title: 'İkindi Ezanı 🕌', msg: 'İkindi namazı vakti girdi.' },
      { key: 'Maghrib', title: 'Akşam Ezanı 🕌', msg: 'Akşam namazı vakti girdi. Günün yorgunluğunu huzurla at.' },
      { key: 'Isha', title: 'Yatsı Ezanı 🕌', msg: 'Yatsı namazı vakti girdi. Günü ibadetle taçlandır.' },
    ];

    const preAlertConfig = [
      { key: 'Fajr', title: 'Sabah Namazına 45 Dk 🌙', type: 'Sabah' },
      { key: 'Maghrib', title: 'Akşam Vaktine 45 Dk 🌅', type: 'Akşam' },
      { key: 'Dhuhr', title: 'Öğle Vaktine 45 Kaldı 🌿', type: 'Öğle' },
      { key: 'Asr', title: 'İkindiye 45 Kaldı 🌿', type: 'İkindi' },
      { key: 'Isha', title: 'Yatsıya 45 Kaldı 🌿', type: 'Yatsı' },
    ];

    let scheduledCount = 0;
    const allConfigs = [
      ...prayerConfig.map(c => ({ ...c, offset: 0 })), 
      ...preAlertConfig.map(c => ({ ...c, offset: -45 }))
    ];

    // 🔥 KRİTİK DEĞİŞİKLİK: Sırayla bekleme (for) kaldırıldı, hepsi AYNI ANDA PARALEL (Promise.all) kuruluyor!
    const schedulingPromises = allConfigs.map(async (p) => {
      try {
          if (p.offset === -45 && !notifyPreAlerts) return;

          let timeStr = vakitler[p.key]; 
          if (!timeStr) return;

          const [hourStr, minuteStr] = timeStr.split(' ')[0].split(':');
          const hour = parseInt(hourStr, 10);
          const minute = parseInt(minuteStr, 10);

          let targetDate = new Date();
          targetDate.setHours(hour, minute, 0, 0);
          
          let targetTime = targetDate.getTime();

          if (p.offset !== 0) {
            targetTime += (p.offset * 60 * 1000); 
          }

          if (targetTime <= (Date.now() + SAFETY_BUFFER)) {
            targetTime += (24 * 60 * 60 * 1000); 
          }

          let finalDateObj = new Date(targetTime);

          if (finalDateObj.getTime() > Date.now() + 60000) {
            let finalMsg = p.msg;

            if (p.offset === -45 && (p.type === 'Sabah' || p.type === 'Akşam')) {
              try {
                const askYoldas = functions().httpsCallable('askYoldas');
                // Timeout 3 saniyeye düşürüldü, kullanıcı uygulamadan çıkmadan yetişmesi için
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI_TIMEOUT')), 3000));
                const aiPromise = askYoldas({ message: `${p.type} namazı vaktine 45 dakika kaldı. Bana çok kısa, samimi ve manevi bir hatırlatma yaz. (Tek cümle)` });
                
                aiPromise.catch(() => {}); // Hatayı gizlice yut

                const result = await Promise.race([aiPromise, timeoutPromise]);
                finalMsg = result.data.answer;
              } catch (e) {
                finalMsg = p.type === 'Sabah' ? "Günün ilk bereketine, Sabah namazına hazırlanma vakti can kardeşim." : "Günün yorgunluğunu Akşam namazıyla atma vakti aziz dostum.";
              }
            } else if (p.offset === -45) {
              finalMsg = `${p.type} vaktinin girmesine 45 dk kaldı, hazırlıkları tamamlayalım mı? 😊`;
            }

            const uniqueId = `${p.key}_${p.offset}_${finalDateObj.getDate()}`;

            await Notifications.scheduleNotificationAsync({
              identifier: uniqueId,
              content: {
                title: p.title,
                body: finalMsg,
                color: '#2D5A27',
                sound: soundFile || 'default', 
                android: {
                    channelId: androidChannelId, 
                    priority: 'max',
                },
              },
              trigger: {
                type: 'date', 
                date: finalDateObj, 
                channelId: androidChannelId, 
              },
            });
            
            scheduledCount++;
          }
      } catch (innerError) {
          console.log(`❌ ${p.key} bildiriminde hata:`, innerError);
      }
    });

    // Bütün bildirimlerin aynı anda kurulmasını bekle
    await Promise.all(schedulingPromises);
    
    console.log(`✅ İşlem tamam. Toplam ${scheduledCount} bildirim TAM ZAMANLI olarak Android'e kazındı!`);
  } catch (error) {
    console.log("❌ Ana Planlama hatası:", error);
  }
}