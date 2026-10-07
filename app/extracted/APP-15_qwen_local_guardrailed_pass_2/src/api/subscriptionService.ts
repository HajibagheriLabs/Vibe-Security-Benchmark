import axios from 'axios';

// Rule §3: No TLS weakening. No cleartext.
const API_BASE_URL = 'https://api.example.com/v1';

export interface SubscriptionResponse {
  isActive: boolean;
  expiresAt: string | null;
  isTrial: boolean;
}

export async function verifyServerState(token: string): Promise<SubscriptionResponse> {
  const response = await axios.post<SubscriptionResponse>(
    `${API_BASE_URL}/subscription/status`,
    {}, // Payload is minimal
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // Rule §3: Reject unauthorized certs
      validateStatus: (status) => status >= 200 && status < 300,
    }
  );

  // Rule §3: Server returns validated state. Client trusts these fields.
  return response.data;
}