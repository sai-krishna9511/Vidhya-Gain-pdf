// Client-side IndexedDB helper to store and retrieve recent processed downloads.
// This allows files processed locally in-browser to be re-downloaded without re-running the tool,
// and persists across browser refreshes/sessions.

export interface RecentDownload {
  id: string;
  fileName: string;
  fileSize: string;
  tool: string;
  timestamp: number;
  blob: Blob;
}

const DB_NAME = 'RecentDownloadsDB';
const STORE_NAME = 'downloads';
const DB_VERSION = 1;

// Initialize the IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// Add a new download and maintain a maximum cap of 10 items to prevent storage bloat
export async function saveRecentDownload(download: Omit<RecentDownload, 'id'>): Promise<RecentDownload> {
  try {
    const db = await openDB();
    const id = 'dl_' + Math.random().toString(36).substring(2, 11);
    const newDownload: RecentDownload = { ...download, id };

    // Start transaction
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Save item
    await new Promise<void>((resolve, reject) => {
      const req = store.put(newDownload);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Fetch all items to enforce cap
    const allItems = await getAllRecentDownloads();
    
    // Sort descending by timestamp (newest first)
    allItems.sort((a, b) => b.timestamp - a.timestamp);

    // If we exceed 10 items, delete the older ones
    if (allItems.length > 10) {
      const toDelete = allItems.slice(10);
      const deleteTransaction = db.transaction(STORE_NAME, 'readwrite');
      const deleteStore = deleteTransaction.objectStore(STORE_NAME);
      
      for (const item of toDelete) {
        deleteStore.delete(item.id);
      }
    }

    return newDownload;
  } catch (err) {
    console.error('Error saving download to IndexedDB:', err);
    // Fallback if IndexedDB fails: return with mock ID
    return { ...download, id: 'dl_fallback_' + Date.now() };
  }
}

// Get all recent downloads, sorted by newest first
export async function getAllRecentDownloads(): Promise<RecentDownload[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise<RecentDownload[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result as RecentDownload[];
        // Sort descending by timestamp (newest first)
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error('Error reading downloads from IndexedDB:', err);
    return [];
  }
}

// Delete a download by id
export async function deleteRecentDownload(id: string): Promise<boolean> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise<boolean>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error deleting download from IndexedDB:', err);
    return false;
  }
}

// Clear all recent downloads
export async function clearAllRecentDownloads(): Promise<boolean> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise<boolean>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error clearing downloads from IndexedDB:', err);
    return false;
  }
}
