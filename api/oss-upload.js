const OSS = require('ali-oss');

const client = new OSS({
  region: process.env.ALIYUN_OSS_REGION,
  accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
  bucket: process.env.ALIYUN_OSS_BUCKET
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end('Method Not Allowed');
    return;
  }

  try {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const roomId = (urlObj.searchParams.get('roomId') || 'default').replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = urlObj.searchParams.get('fileName') || 'photo.jpg';
    const extIndex = fileName.lastIndexOf('.');
    const ext = extIndex >= 0 ? fileName.slice(extIndex) : '.jpg';
    const key = `rooms/${roomId}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (!buffer.length) {
      res.statusCode = 400;
      res.end('Empty body');
      return;
    }

    const result = await client.put(key, buffer);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ url: result.url, key }));
  } catch (err) {
    console.error('OSS upload error', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: err && err.message ? err.message : String(err) }));
  }
};

