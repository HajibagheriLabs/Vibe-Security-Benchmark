import { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { url, headers: targetHeaders, body: targetBody } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Missing required field: url' });
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...targetHeaders,
      },
      body: targetBody ? JSON.stringify(targetBody) : undefined,
    });

    const data = await response.json().catch(() => null);

    return res.status(response.status).json({
      status: response.status,
      statusText: response.statusText,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to send webhook',
      message: (error as Error).message,
    });
  }
}