// app/api/test-webhook/types.ts
export interface WebhookTestRequest {
  targetUrl: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  payload?: any;
  timeout?: number;
}

export interface WebhookTestResponse {
  success: boolean;
  statusCode?: number;
  statusText?: string;
  responseTime?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  request?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    payload: any;
  };
  error?: string;
  details?: string;
}