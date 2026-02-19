export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GATEWAY_URL = 'https://oyxpvo2t8uxuuk-18789.proxy.runpod.net';
  const TOKEN = 'dcb99a5cbec2dfd354b3303e6bd8e986bb1395f4e6cbeb2d';

  try {
    const response = await fetch(`${GATEWAY_URL}/health`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    res.status(200).json({
      status: response.ok ? 'online' : 'error',
      statusCode: response.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(200).json({
      status: 'offline',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
