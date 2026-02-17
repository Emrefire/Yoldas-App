import { SURE_ISIMLERI, GUNLUK_HADISLER, GUNLUK_DUALAR, ESMA_TR_LIST } from './islamicData';

// 1. KATEGORİLER
export const libraryCategories = [
  { id: '1', title: "Kur'an-ı Kerim", subtitle: "Sureler ve Anlamları", icon: 'book-open', color: '#AF52DE', type: 'quran' },
  { id: '2', title: 'Hadis-i Şerifler', subtitle: 'Peygamberimizden Öğütler', icon: 'feather', color: '#34C759', type: 'hadith' },
  { id: '3', title: 'Günlük Dualar', subtitle: 'Manevi Zırhımız', icon: 'heart', color: '#FF9500', type: 'dua' },
  { id: '4', title: 'Esmaül Hüsna', subtitle: 'En Güzel İsimler', icon: 'star', color: '#5856D6', type: 'esma' }
];

// 2. İÇERİKLER
export const libraryContent = {
  // KUR'AN
  '1': SURE_ISIMLERI.map(sure => ({
    id: sure.id.toString(),
    title: `${sure.id}. ${sure.name} Suresi`,
    detail: `${sure.ayet} Ayet`,
    meaning: sure.anlami
  })),

  // HADİSLER
  '2': GUNLUK_HADISLER.map((hadis, index) => ({
    id: `h-${index}`,
    title: "Hadis-i Şerif",
    detail: hadis.text,
    meaning: `Kaynak: ${hadis.source}`
  })),

  // DUALAR
  '3': GUNLUK_DUALAR.map((dua, index) => ({
    id: `d-${index}`,
    title: "Dua",
    detail: dua.text,
    meaning: `Kaynak: ${dua.source}`
  })),

  // ESMAÜL HÜSNA
  '4': ESMA_TR_LIST.map(item => ({
    id: item.number.toString(),
    title: `${item.number}. ${item.name}`,
    detail: item.arabic, 
    meaning: item.meaning
  }))
};

// KRİTİK DÜZELTME: GUNLUK_HADISLER'i buradan dışarı aktarıyoruz ki HomeScreen görebilsin!
export { SURE_ISIMLERI, ESMA_TR_LIST, GUNLUK_HADISLER, GUNLUK_DUALAR };