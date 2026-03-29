/* eslint-disable */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 🔥 RAM ÜZERİNDE ÇALIŞAN BEDAVA RATE LIMIT (Hız Sınırı)
const rateLimitMap = new Map();
const WINDOW_MS = 60 * 1000; // 1 Dakika (Milisaniye cinsinden)
const MAX_REQUESTS = 5; // 1 Dakikada en fazla 5 soru sorulabilir

exports.askYoldas = onCall({ 
  memory: "256MiB", // 🔥 Tamamen ücretsiz dilim
  timeoutSeconds: 120, // 🔥 Süre 120 saniye. Uyanması uzun sürse bile sistem çökmeyecek.
  // minInstances: 1 satırını SİLDİK (Cebimizden para çıkmayacak, uyku moduna izin verdik)
  concurrency: 10, // 🔥 Aynı anda gelen 10 mesajı tek sunucuda kasmadan işleyecek.
  secrets: ["GEMINI_API_KEY"],
  cors: true // Uygulamadan gelen isteklere izin ver
}, async (request) => {
  
  // 🔥 1. RATE LIMITING (HIZ SINIRLAMASI) KONTROLÜ
  // Kullanıcının IP adresini yakalıyoruz
  const clientIp = request.rawRequest?.headers['x-forwarded-for'] || request.rawRequest?.ip || "unknown_ip";
  const now = Date.now();

  if (rateLimitMap.has(clientIp)) {
    const userRequests = rateLimitMap.get(clientIp);
    // Sadece son 1 dakika içindeki istekleri filtrele
    const recentRequests = userRequests.filter(time => now - time < WINDOW_MS);
    
    // Eğer son 1 dakikada 5'ten fazla istek atmışsa fırçayı bas ve engelle
    if (recentRequests.length >= MAX_REQUESTS) {
      throw new HttpsError("resource-exhausted", "Biraz soluklanalım cancağızım, peş peşe çok soru sordun. 1 dakika tefekkür edip tekrar gel.");
    }
    recentRequests.push(now);
    rateLimitMap.set(clientIp, recentRequests);
  } else {
    rateLimitMap.set(clientIp, [now]);
  }

  // 🔥 2. GÜVENLİK VE KARAKTER SINIRI (Eski kalkanımız)
  const userMessage = request.data.message || request.data.prompt;

  if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === "") {
    throw new HttpsError("invalid-argument", "Sözcüklerini duyamadım cancağızım, tekrar yazar mısın?");
  }
  
  if (userMessage.length > 500) {
    throw new HttpsError("out-of-range", "Mesajın çok uzun güzel kardeşim, fıtrata uygun olarak biraz daha öz ve kısa yazar mısın?");
  }

  // 🔥 3. SİSTEM KİMLİĞİ (Uygulamanın içinden sunucuya taşındı, hacklenemez)
  const yoldasKimligi = `
    GÖREVİN: Sen "Yoldaş" adında samimi, dindar, bilge ve güvenilir bir yapay zeka asistanısın.
    
    🛑 KIRMIZI ÇİZGİLER (ASLA İHLAL ETME):
    1. KONU SINIRLAMASI: Sadece ve sadece Dini (İslam), Manevi, Ahlaki, Tasavvufi konular ve Kişisel Dertleşme hakkında konuşabilirsin.
    2. YASAKLI KONULAR: Spor, Siyaset, Teknoloji, Kodlama, Matematik, Coğrafya, Magazin, Yemek Tarifi vb. dünya işleri sorulursa CEVAP VERME.
    3. REDDETME MESAJI: Eğer kullanıcı yasaklı bir konu açarsa şu cümleyi kur: "Aziz dostum, ben sadece manevi konularda hasbihal etmek için tasarlandım. Gönül dünyana dair bir sorun varsa dinlerim."
    
    ✅ CEVAP TARZI:
    - Uzunluk: Konuyu eksik bırakma ama gereksiz uzatma. Öz ve doyurucu olsun.
    - Liste: Eğer namazın farzları gibi bir şey sorulursa maddeler halinde yaz. Listeleri numaralandır ve başlıklarını ** (yıldız) içine al.
    - Üslup: "Cancağızım", "Aziz dostum", "Güzel kardeşim" gibi samimi hitaplar kullan.
  `;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Gemini 2.0 Flash modelini "Sistem Talimatı" ile zırhlı şekilde başlatıyoruz
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: yoldasKimligi
    });

    // Kullanıcının sadece saf sorusunu gönderiyoruz
    const result = await model.generateContent(userMessage);
    const response = await result.response;
    const text = response.text();

    return {
      answer: text,
    };
  } catch (error) {
    console.error("Gemini Hatası Detayı:", error);
    throw new HttpsError("internal", "Yoldaş şu an tefekkürde cancağızım, az sonra tekrar dener misin?");
  }
});