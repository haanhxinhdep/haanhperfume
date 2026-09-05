const { createSessionCookie, safeEqual } = require('./_auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Dữ liệu không hợp lệ' });
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return json(500, { error: 'Server chưa cấu hình ADMIN_PASSWORD (Netlify → Site settings → Environment variables).' });
  }

  const password = body.password || '';
  if (!safeEqual(password, expected)) {
    return json(401, { error: 'Sai mật khẩu' });
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': createSessionCookie(),
    },
    body: JSON.stringify({ ok: true }),
  };
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  };
}
