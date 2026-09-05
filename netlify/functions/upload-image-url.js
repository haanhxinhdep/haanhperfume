// Cho phép admin dán link ảnh từ mạng thay vì phải tự tải file về máy rồi upload.
// Server tự tải ảnh từ link đó về và lưu vào Netlify Blobs (giống upload-image.js),
// trả về URL nội bộ để dùng cho sản phẩm.
const crypto = require('crypto');
const { isAuthenticated } = require('./_auth');
const { getStoreSafe } = require('./_store');

const STORE_NAME = 'images';
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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

  const sourceUrl = (body.url || '').trim();
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch (e) {
    return json(400, { error: 'Link ảnh không hợp lệ' });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return json(400, { error: 'Link ảnh phải bắt đầu bằng http:// hoặc https://' });
  }

  let response;
  try {
    response = await fetch(sourceUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HaAnhPerfumeBot/1.0; +https://haanhperfume.netlify.app)' },
    });
  } catch (e) {
    return json(400, { error: 'Không tải được ảnh từ link này (mạng lỗi hoặc trang web chặn truy cập).' });
  }

  if (!response.ok) {
    return json(400, { error: `Không tải được ảnh từ link này (lỗi ${response.status}).` });
  }

  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.includes(contentType)) {
    return json(400, { error: 'Link này không dẫn tới ảnh JPEG/PNG/WEBP/GIF hợp lệ.' });
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_BYTES) {
    return json(400, { error: 'Ảnh quá lớn (tối đa 5MB).' });
  }
  const raw = Buffer.from(arrayBuffer);

  const ext = contentType === 'image/jpeg' ? 'jpg' : contentType.split('/')[1];
  const id = crypto.randomBytes(8).toString('hex');
  const key = `${id}.${ext}`;

  let store;
  try {
    store = getStoreSafe(STORE_NAME);
  } catch (e) {
    return json(500, { error: e.message });
  }
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
