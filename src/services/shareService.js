import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export const shareAsImage = async (viewRef) => {
  try {
    // 1. Görünümü resme dönüştür
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 0.9,
    });

    // 2. Paylaşım özelliğinin kullanılabilirliğini kontrol et
    if (!(await Sharing.isAvailableAsync())) {
      alert("Paylaşım bu cihazda desteklenmiyor.");
      return;
    }

    // 3. Paylaş
    await Sharing.shareAsync(uri);
  } catch (error) {
    console.error("Paylaşım hatası:", error);
  }
};