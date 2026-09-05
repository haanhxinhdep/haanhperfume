// Helper dùng chung để đăng nhập/xác thực trang admin.
// Không phải 1 Netlify Function (tên bắt đầu bằng "_" nên Netlify bỏ qua, không tạo endpoint).
const crypto = require('crypto');

const COOKIE_NAME = 'admin_session';
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 ngày

function getSecret() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error('Thiếu biến môi trường ADMIN_SECRET trên Netlify (Site settings → Environment variables).');
  }
  return secret;
}

function sign(payload) {
  const secret = getSecret();
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verify(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  let expected;
  try {
    expected = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  } catch (e) {
    return null;
  }
  const sigBuf = Buffer.from(sig || '');
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
  if (!payload || !payload.exp || Date.now() > payload.exp) return null;
  return payload;
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a == null ? '' : a));
  const bufB = Buffer.from(String(b == null ? '' : b));
  if (bufA.length !== bufB.length) {
    // So sánh với chính nó để giữ thời gian xử lý ổn định, tránh timing attack.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function createSessionCookie() {
  const token = sign({ exp: Date.now() + MAX_AGE_SECONDS * 1000 });
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch (e) {
      out[k] = v;
    }
  });
  return out;
}

function isAuthenticated(event) {
  const header = event.headers && (event.headers.cookie || event.headers.Cookie);
  const cookies = parseCookies(header);
  return !!verify(cookies[COOKIE_NAME]);
}

module.exports = {
  COOKIE_NAME,
  createSessionCookie,
  clearSessionCookie,
  isAuthenticated,
  safeEqual,
};
