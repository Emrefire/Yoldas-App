import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('yoldas.db');

export const initDB = () => {
  // Geliştirme aşamasında tabloyu sıfırlamak için (Gerekirse açarsın):
  // db.execSync(`DROP TABLE IF EXISTS favoriler;`);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS ameller (
      id INTEGER PRIMARY KEY NOT NULL,
      baslik TEXT NOT NULL,
      tamamlandi INTEGER DEFAULT 0
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS favoriler (
      id TEXT PRIMARY KEY NOT NULL,
      kategori_id TEXT NOT NULL,
      surah_name TEXT,
      arabic_text TEXT,
      turkish_text TEXT,
      ayah_number INTEGER
    );
  `);

  const rowCount = db.getFirstSync('SELECT COUNT(*) as count FROM ameller');
  if (rowCount.count === 0) {
    db.runSync('INSERT INTO ameller (baslik, tamamlandi) VALUES (?, ?)', ['Sabah Namazı', 0]);
    db.runSync('INSERT INTO ameller (baslik, tamamlandi) VALUES (?, ?)', ['Kuşluk Namazı', 0]);
    db.runSync('INSERT INTO ameller (baslik, tamamlandi) VALUES (?, ?)', ['10 Sayfa Kitap/Kuran Okuma', 0]);
  }
};

// --- GÖREV YÖNETİMİ ---
export const addAmel = (baslik) => db.runSync('INSERT INTO ameller (baslik, tamamlandi) VALUES (?, 0)', [baslik]);

export const getAmeller = () => db.getAllSync('SELECT * FROM ameller');

export const updateAmelStatus = (id, status) => db.runSync('UPDATE ameller SET tamamlandi = ? WHERE id = ?', [status, id]);

// YENİ EKLENEN SİLME FONKSİYONU
export const deleteAmel = (id) => db.runSync('DELETE FROM ameller WHERE id = ?', [id]);


// --- FAVORİ YÖNETİMİ ---
export const addFavorite = (favObj) => {
  db.runSync(
    'INSERT INTO favoriler (id, kategori_id, surah_name, arabic_text, turkish_text, ayah_number) VALUES (?, ?, ?, ?, ?, ?)', 
    [
      favObj.id, 
      favObj.catId, 
      favObj.surahName, 
      favObj.arabic, 
      favObj.turkish, 
      favObj.number
    ]
  );
};

export const removeFavorite = (id) => db.runSync('DELETE FROM favoriler WHERE id = ?', [id]);

export const getFavorites = () => db.getAllSync('SELECT * FROM favoriler');

export const isFavorite = (id) => {
  const result = db.getFirstSync('SELECT id FROM favoriler WHERE id = ?', [id]);
  return !!result;
};

export default db;