import axios from 'axios';
import { SURE_ISIMLERI, GUNLUK_HADISLER, GUNLUK_DUALAR, ESMA_TR_LIST } from '../database/islamicData';

// 🔥 API URL'LERİNİ .ENV DOSYASINDAN ÇEKİYORUZ
const QURAN_API_BASE = process.env.EXPO_PUBLIC_KURAN_API_URL;
const ALADHAN_API = process.env.EXPO_PUBLIC_EZAN_API_URL; // Not: .env'de /timings eki olmayabilir, burada duruma göre ekleyeceğiz.

const BISMILLAH_TEXT = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

export const fetchLibraryData = async (categoryId) => {
  try {
    const config = { timeout: 8000 };
    switch (categoryId) {
      case '1': // KUR'AN
        return SURE_ISIMLERI.map(sure => ({
           id: sure.id.toString(),
           title: `${sure.id}. ${sure.name} Suresi`,
           detail: `${sure.ayet} Ayet`,
           meaning: sure.anlami,
           juz: sure.juz, 
           page: sure.page 
        }));
      case '2': // HADİS
        return GUNLUK_HADISLER.map((hadis, index) => ({
           id: `h-${index}`,
           title: "Hadis-i Şerif",
           detail: hadis.text,
           meaning: `Kaynak: ${hadis.source}`
        }));
      case '3': // DUA
        return GUNLUK_DUALAR.map((dua, index) => ({
           id: `d-${index}`,
           title: "Dua",
           detail: dua.text,
           meaning: `Kaynak: ${dua.source}`
        }));
      case '4': // ESMA
        try {
           // Aladhan API url'si genellikle v1/timings ile biterse burayı v1 olarak düzeltmek gerekebilir.
           // Eğer .env'de "https://api.aladhan.com/v1" yazıyorsa sorun yok.
           const esmaRes = await axios.get(`${ALADHAN_API}/asmaAlHusna`, config);
           const apiData = esmaRes.data.data;
           if (Array.isArray(apiData)) {
               return apiData.map(item => {
                 const trData = ESMA_TR_LIST.find(e => e.number === item.number);
                 return {
                   id: item.number.toString(),
                   title: trData ? trData.name : item.transliteration, 
                   detail: item.name, 
                   meaning: trData ? trData.meaning : (item.en ? item.en.meaning : "Allah'ın güzel isimlerinden.")
                 };
               });
           } else { throw new Error("API hatası"); }
        } catch (apiError) {
           return ESMA_TR_LIST.map(item => ({
             id: item.number.toString(),
             title: item.name,
             detail: item.arabic || "Esmaül Hüsna", 
             meaning: item.meaning
           }));
        }
      default: return [];
    }
  } catch (error) { return []; }
};

export const fetchSurahDetail = async (surahId) => {
  try {
    const config = { timeout: 10000 };
    // 🔥 URL GÜNCELLENDİ
    const response = await axios.get(`${QURAN_API_BASE}/surah/${surahId}/editions/quran-uthmani,tr.diyanet`, config);
    const json = response.data;

    if (json.code === 200 && json.data.length >= 2) {
      const arabicData = json.data[0];
      const turkishData = json.data[1];

      const formattedArabic = arabicData.ayahs.map((ayah) => {
        let cleanText = ayah.text;
        // Tevbe (9) hariç ilk ayetlerden besmeleyi temizle (görselde zaten var)
        if (Number(surahId) !== 1 && Number(surahId) !== 9 && ayah.numberInSurah === 1) {
          cleanText = cleanText.replace(BISMILLAH_TEXT, "").trim();
        }
        return {
          number: ayah.number,
          text: cleanText,
          numberInSurah: ayah.numberInSurah,
          juz: ayah.juz,
          page: ayah.page,
        };
      });

      return {
        info: {
          englishName: arabicData.englishName,
          name: arabicData.name,
          revelationType: arabicData.revelationType,
          numberOfAyahs: arabicData.numberOfAyahs
        },
        arabic: formattedArabic,
        turkish: turkishData.ayahs
      };
    }
    return null;
  } catch (error) {
    console.error("Sure detayı çekilemedi:", error.message);
    return null;
  }
};

// 🔥 YENİ EKLENENLER: SAYFA VE CÜZ BULUCULAR (GÜVENLİ)
export const getSurahInfoByPage = async (pageNumber) => {
    try {
        // 🔥 URL GÜNCELLENDİ
        const res = await axios.get(`${QURAN_API_BASE}/page/${pageNumber}/quran-uthmani?limit=1`);
        if (res.data.data.ayahs.length > 0) {
            return res.data.data.ayahs[0].surah; 
        }
        return null;
    } catch (error) { return null; }
};

export const getSurahInfoByJuz = async (juzNumber) => {
    try {
        // 🔥 URL GÜNCELLENDİ
        const res = await axios.get(`${QURAN_API_BASE}/juz/${juzNumber}/quran-uthmani?limit=1`);
        if (res.data.data.ayahs.length > 0) {
            return res.data.data.ayahs[0].surah;
        }
        return null;
    } catch (error) { return null; }
};