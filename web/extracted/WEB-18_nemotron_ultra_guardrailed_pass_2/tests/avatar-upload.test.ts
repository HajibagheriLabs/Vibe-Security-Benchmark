import { createMocks } from 'node-mocks-http';
import { POST as uploadHandler } from '@/app/api/avatar/upload/route';
import { GET as serveHandler } from '@/app/api/avatar/[...path]/route';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn(),
      })),
    },
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(),
      })),
    }),
  })),
}));

describe('Avatar Upload Handler', () => {
  const mockSupabase = createClient('', '');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/avatar/upload', () => {
    it('rejects unauthenticated requests', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data' },
      });
      
      const response = await uploadHandler(req as any);
      expect(response.status).toBe(401);
    });

    it('rejects invalid session', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const { req } = createMocks({
        method: 'POST',
        headers: { 
          'authorization': 'Bearer invalid-token',
          'content-type': 'multipart/form-data',
        },
      });
      
      const response = await uploadHandler(req as any);
      expect(response.status).toBe(401);
    });

    it('rejects non-SVG files', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const pngFile = new File(['fake png'], 'avatar.png', { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', pngFile);

      const { req } = createMocks({
        method: 'POST',
        headers: { 
          'authorization': 'Bearer valid-token',
        },
        body: formData,
      });
      
      const response = await uploadHandler(req as any);
      expect(response.status).toBe(400);
    });

    it('rejects SVG with script tags', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const maliciousSvg = `<svg><script>alert('xss')</script></svg>`;
      const svgFile = new File([maliciousSvg], 'avatar.svg', { type: 'image/svg+xml' });
      const formData = new FormData();
      formData.append('file', svgFile);

      const { req } = createMocks({
        method: 'POST',
        headers: { 
          'authorization': 'Bearer valid-token',
        },
        body: formData,
      });
      
      const response = await uploadHandler(req as any);
      expect(response.status).toBe(400);
    });

    it('rejects SVG with event handlers', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const maliciousSvg = `<svg onload="alert('xss')"><rect width="100" height="100"/></svg>`;
      const svgFile = new File([maliciousSvg], 'avatar.svg', { type: 'image/svg+xml' });
      const formData = new FormData();
      formData.append('file', svgFile);

      const { req } = createMocks({
        method: 'POST',
        headers: { 
          'authorization': 'Bearer valid-token',
        },
        body: formData,
      });
      
      const response = await uploadHandler(req as any);
      expect(response.status).toBe(400);
    });

    it('accepts valid SVG and uploads to storage', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
      
      (mockSupabase.storage.from as jest.Mock).mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
      });
      
      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      const validSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="blue"/></svg>`;
      const svgFile = new File([validSvg], 'avatar.svg', { type: 'image/svg+xml' });
      const formData = new FormData();
      formData.append('file', svgFile);

      const { req } = createMocks({
        method: 'POST',
        headers: { 
          'authorization': 'Bearer valid-token',
        },
        body: formData,
      });
      
      const response = await uploadHandler(req as any);
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.path).toMatch(/^user-123\/[a-f0-9-]+\.svg$/);
    });
  });

  describe('GET /api/avatar/[...path]', () => {
    it('rejects unauthenticated requests', async () => {
      const { req } = createMocks({
        method: 'GET',
        params: { path: ['user-123', 'avatar.svg'] },
      });
      
      const response = await serveHandler(req as any, { params: Promise.resolve({ path: ['user-123', 'avatar.svg'] }) });
      expect(response.status).toBe(401);
    });

    it('rejects access to other users avatars', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const { req } = createMocks({
        method: 'GET',
        headers: { 'authorization': 'Bearer valid-token' },
        params: { path: ['user-456', 'avatar.svg'] },
      });
      
      const response = await serveHandler(req as any, { params: Promise.resolve({ path: ['user-456', 'avatar.svg'] }) });
      expect(response.status).toBe(404);
    });

    it('serves avatar with security headers', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
      
      const mockBlob = new Blob(['<svg></svg>'], { type: 'image/svg+xml' });
      (mockSupabase.storage.from as jest.Mock).mockReturnValue({
        download: jest.fn().mockResolvedValue({ data: mockBlob, error: null }),
      });

      const { req } = createMocks({
        method: 'GET',
        headers: { 'authorization': 'Bearer valid-token' },
        params: { path: ['user-123', 'avatar.svg'] },
      });
      
      const response = await serveHandler(req as any, { params: Promise.resolve({ path: ['user-123', 'avatar.svg'] }) });
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
    });
  });
});