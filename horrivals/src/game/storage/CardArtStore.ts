const DB_NAME = 'horrivals-card-art-v1';
const STORE = 'art';

export interface ImportResult {
  imported: string[];
  rejected: string[];
}

function normalizeIdFromName(name: string): string | null {
  const m = name.toUpperCase().match(/(?:HOR|SCI)[-_ ]?0*(\d{1,3})/);
  if (!m) return null;
  const prefix = name.toUpperCase().includes('SCI') ? 'SCI' : 'HOR';
  return `${prefix}-${m[1].padStart(3, '0')}`;
}

export class CardArtStore {
  private dbPromise: Promise<IDBDatabase>;
  private objectUrls = new Map<string, string>();

  constructor() {
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async putForCard(cardId: string, file: File | Blob): Promise<void> {
    if (!(file instanceof Blob) || !file.type.startsWith('image/')) {
      throw new Error('Le fichier choisi n’est pas une image valide.');
    }
    const db = await this.dbPromise;
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(file, cardId);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Import annulé.'));
    });
    this.revoke(cardId);
  }

  async importFiles(files: FileList | File[], knownIds: Set<string>): Promise<ImportResult> {
    const imported: string[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      const id = normalizeIdFromName(file.name);
      if (!id || !knownIds.has(id) || !file.type.startsWith('image/')) {
        rejected.push(file.name);
        continue;
      }
      await this.putForCard(id, file);
      imported.push(id);
    }
    return { imported, rejected };
  }

  async getObjectUrl(cardId: string): Promise<string | null> {
    if (this.objectUrls.has(cardId)) return this.objectUrls.get(cardId)!;
    const db = await this.dbPromise;
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(cardId);
      req.onsuccess = () => resolve(req.result as Blob | undefined);
      req.onerror = () => reject(req.error);
    });
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    this.objectUrls.set(cardId, url);
    return url;
  }

  private revoke(id: string): void {
    const url = this.objectUrls.get(id);
    if (url) URL.revokeObjectURL(url);
    this.objectUrls.delete(id);
  }
}
