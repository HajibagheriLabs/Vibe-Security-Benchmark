import {
  cacheDocument,
  getCachedDocument,
  deleteCachedDocument,
  clearAllCachedDocuments,
  listCachedDocuments,
  getCacheSize,
} from '../cache';
import { clearEncryptionKey } from '../encryption';

describe('Encrypted Document Cache', () => {
  beforeEach(async () => {
    await clearEncryptionKey();
    await clearAllCachedDocuments();
  });

  afterAll(async () => {
    await clearAllCachedDocuments();
    await clearEncryptionKey();
  });

  it('caches and retrieves a document', async () => {
    const docId = 'test_doc_1';
    const content = 'Cached document content';
    
    await cacheDocument(docId, content);
    const retrieved = await getCachedDocument(docId);
    
    expect(retrieved).toBe(content);
  });

  it('returns null for non-existent document', async () => {
    const retrieved = await getCachedDocument('non_existent');
    expect(retrieved).toBeNull();
  });

  it('deletes a cached document', async () => {
    const docId = 'doc_to_delete';
    await cacheDocument(docId, 'Content to delete');
    
    await deleteCachedDocument(docId);
    const retrieved = await getCachedDocument(docId);
    
    expect(retrieved).toBeNull();
  });

  it('lists all cached documents', async () => {
    await cacheDocument('doc_a', 'Content A');
    await cacheDocument('doc_b', 'Content B');
    await cacheDocument('doc_c', 'Content C');
    
    const listed = await listCachedDocuments();
    expect(listed.sort()).toEqual(['doc_a', 'doc_b', 'doc_c'].sort());
  });

  it('clears all cached documents', async () => {
    await cacheDocument('doc_1', 'Content 1');
    await cacheDocument('doc_2', 'Content 2');
    
    await clearAllCachedDocuments();
    
    const listed = await listCachedDocuments();
    expect(listed).toHaveLength(0);
  });

  it('reports cache size', async () => {
    await cacheDocument('small', 'x');
    await cacheDocument('large', 'x'.repeat(10000));
    
    const size = await getCacheSize();
    expect(size).toBeGreaterThan(10000);
  });

  it('handles concurrent cache operations', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      cacheDocument(`concurrent_${i}`, `Content ${i}`)
    );
    await Promise.all(promises);
    
    const listed = await listCachedDocuments();
    expect(listed).toHaveLength(10);
  });

  it('persists across key rotation (documents become unreadable)', async () => {
    const docId = 'persist_test';
    await cacheDocument(docId, 'Original content');
    
    await clearEncryptionKey();
    
    const retrieved = await getCachedDocument(docId);
    expect(retrieved).toBeNull();
  });
});