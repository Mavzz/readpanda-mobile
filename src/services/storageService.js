import { MMKV } from "react-native-mmkv";
import SQLite from "react-native-sqlite-storage";

export const mmkvStorage = new MMKV({
  id: "readpanda-storage",
  encryptionKey: "your-encryption-key", // Replace with your actual encryption key
});

SQLite.enablePromise(true);
SQLite.DEBUG(false);

class StorageService {
  constructor() {
    this.db = null;
    this.initDatabase();
  }

  async initDatabase() {
    try {
      this.db = await SQLite.openDatabase({
        name: "readpanda.db",
        dbVersion: "1.0",
        displayName: "ReadPanda Database",
        dbSize: 200000,
        location: "default",
      });

      await this.createTables();
      console.log("Database initialized");
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }

  async createTables() {
    if (!this.db) return;

    try {

      const tables = [
        // Books with full-text search support
        `CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        genre TEXT,
        cover_image_url TEXT,
        manuscript_url TEXT,
        description TEXT,
        publication_date TEXT,
        rating REAL DEFAULT 0,
        is_favorite BOOLEAN DEFAULT 0,
        download_progress INTEGER DEFAULT 0,
        is_downloaded BOOLEAN DEFAULT 0,
        file_size INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

        // Reading progress with detailed tracking
        `CREATE TABLE IF NOT EXISTS reading_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        book_id TEXT NOT NULL,
        current_page INTEGER DEFAULT 1,
        total_pages INTEGER DEFAULT 0,
        reading_time_minutes INTEGER DEFAULT 0,
        completion_percentage REAL DEFAULT 0,
        last_read DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(username, book_id)
      )`,

        // Reading sessions for analytics
        `CREATE TABLE IF NOT EXISTS reading_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        book_id TEXT NOT NULL,
        session_start DATETIME NOT NULL,
        session_end DATETIME,
        pages_read INTEGER DEFAULT 0,
        session_duration_minutes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

        // Bookmarks and highlights
        `CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        book_id TEXT NOT NULL,
        page_number INTEGER NOT NULL,
        bookmark_type TEXT DEFAULT 'bookmark', -- 'bookmark' or 'highlight'
        note TEXT,
        highlight_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

        // Offline queue for sync when online
        `CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation_type TEXT NOT NULL, -- 'progress', 'bookmark', 'favorite'
        data TEXT NOT NULL, -- JSON data
        is_synced BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
      ];

      for (const tableSQL of tables) {
        await this.db.executeSql(tableSQL);
      }

      // Create indexes for better performance
      await this.createIndexes();

      console.log("Tables created");
    } catch (error) {
      console.error("Error creating tables:", error);
    }
  }

  async createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_books_title ON books(title)',
      'CREATE INDEX IF NOT EXISTS idx_books_author ON books(author)',
      'CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre)',
      'CREATE INDEX IF NOT EXISTS idx_reading_progress_user ON reading_progress(username)',
      'CREATE INDEX IF NOT EXISTS idx_bookmarks_user_book ON bookmarks(username, book_id)'
    ];

    for (const indexSQL of indexes) {
      await this.db.executeSql(indexSQL);
    }
  }

  // MMKV Methods for fast key-value storage
  setItem(key, value) {
    try {
      mmkvStorage.set(key, JSON.stringify(value));
    } catch (error) {
      console.error('MMKV setItem error:', error);
    }
  }

  getItem(key) {
    try {
      const value = mmkvStorage.getString(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('MMKV getItem error:', error);
      return null;
    }
  }

  removeItem(key) {
    try {
      mmkvStorage.delete(key);
    } catch (error) {
      console.error('MMKV removeItem error:', error);
    }
  }

  // Books operations
  async saveBooks(books) {
    try {
      const insertSQL = `INSERT OR REPLACE INTO books 
        (book_id, title, author, genre, cover_image_url, manuscript_url, 
         description, publication_date, rating, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
      
      for (const book of books) {
        await this.db.executeSql(insertSQL, [
          book.book_id,
          book.title,
          book.author || '',
          book.genre || '',
          book.cover_image_url || '',
          book.manuscript_url || '',
          book.description || '',
          book.publication_date || '',
          book.rating || 0
        ]);
      }
      log.info(`Saved ${books.length} books to local database`);
    } catch (error) {
      log.error('Error saving books:', error);
      throw error;
    }
  }

  async searchBooks(query) {
    try {
      const searchSQL = `
        SELECT * FROM books 
        WHERE title LIKE ? OR author LIKE ? OR genre LIKE ?
        ORDER BY 
          CASE 
            WHEN title LIKE ? THEN 1
            WHEN author LIKE ? THEN 2
            ELSE 3
          END,
          title ASC
      `;
      const searchTerm = `%${query}%`;
      const exactMatch = `${query}%`;
      
      const [results] = await this.db.executeSql(searchSQL, [
        searchTerm, searchTerm, searchTerm, exactMatch, exactMatch
      ]);
      
      const books = [];
      for (let i = 0; i < results.rows.length; i++) {
        books.push(results.rows.item(i));
      }
      return books;
    } catch (error) {
      log.error('Error searching books:', error);
      throw error;
    }
  }

  async getFavoriteBooks(username) {
    try {
      const [results] = await this.db.executeSql(
        'SELECT * FROM books WHERE is_favorite = 1 ORDER BY updated_at DESC'
      );
      
      const books = [];
      for (let i = 0; i < results.rows.length; i++) {
        books.push(results.rows.item(i));
      }
      return books;
    } catch (error) {
      log.error('Error getting favorite books:', error);
      throw error;
    }
  }

  // Reading progress with advanced tracking
  async saveReadingProgress(username, bookId, currentPage, totalPages) {
    try {
      const completionPercentage = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
      
      const insertSQL = `INSERT OR REPLACE INTO reading_progress 
        (username, book_id, current_page, total_pages, completion_percentage, last_read) 
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
      
      await this.db.executeSql(insertSQL, [
        username, bookId, currentPage, totalPages, completionPercentage
      ]);
      
      // Add to sync queue for later upload
      await this.addToSyncQueue('progress', {
        username, bookId, currentPage, totalPages, completionPercentage
      });
      
    } catch (error) {
      log.error('Error saving reading progress:', error);
      throw error;
    }
  }

  async getRecentlyRead(username, limit = 5) {
    try {
      const [results] = await this.db.executeSql(`
        SELECT b.*, rp.current_page, rp.total_pages, rp.completion_percentage, rp.last_read
        FROM books b
        JOIN reading_progress rp ON b.book_id = rp.book_id
        WHERE rp.username = ?
        ORDER BY rp.last_read DESC
        LIMIT ?
      `, [username, limit]);
      
      const books = [];
      for (let i = 0; i < results.rows.length; i++) {
        books.push(results.rows.item(i));
      }
      return books;
    } catch (error) {
      log.error('Error getting recently read books:', error);
      throw error;
    }
  }

  // Sync queue for offline operations
  async addToSyncQueue(operationType, data) {
    try {
      const insertSQL = `INSERT INTO sync_queue (operation_type, data) VALUES (?, ?)`;
      await this.db.executeSql(insertSQL, [operationType, JSON.stringify(data)]);
    } catch (error) {
      log.error('Error adding to sync queue:', error);
    }
  }

  async getPendingSyncOperations() {
    try {
      const [results] = await this.db.executeSql(
        'SELECT * FROM sync_queue WHERE is_synced = 0 ORDER BY created_at ASC'
      );
      
      const operations = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        operations.push({
          ...row,
          data: JSON.parse(row.data)
        });
      }
      return operations;
    } catch (error) {
      log.error('Error getting pending sync operations:', error);
      return [];
    }
  }

}

export default new StorageService();