const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');
const { isAuthenticated } = require('./_auth');

const STORE_NAME = 'images';
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const DATA_URL_RE = /^data:(image\/(jpeg|png|webp|gif));base64,(.+)$/;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }
  if (!isAuthenticated(event)) {
    return json(401, { error: 'Chưa đăng nhập hoặc phiên đã hết hạn' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Dữ liệu không hợp lệ' });
  }

  const match = DATA_URL_RE.exec(body.dataUrl || '');
  if (!match) {
    return json(400, { error: 'Ảnh không hợp lệ. Chỉ hỗ trợ JPEG, PNG, WEBP, GIF.' });
  }

  const contentType = match[1];
  const ext = match[2] === 'jpeg' ? 'jpg' : match[2];
  const raw = Buffer.from(match[3], 'base64');
  if (raw.length > MAX_BYTES) {
    return json(400, { error: 'Ảnh quá lớn (tối đa 5MB), vui lòng chọn ảnh nhỏ hơn.' });
  }

  const id = crypto.randomBytes(8).toString('hex');
  const key = `${id}.${ext}`;
  const store = getStore(STORE_NAME);
  await store.set(key, raw, { metadata: { contentType } });

  return json(200, { url: `/.netlify/functions/get-image?id=${encodeURIComponent(key)}` });
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  };
}
