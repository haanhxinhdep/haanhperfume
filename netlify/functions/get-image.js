const { getStoreSafe } = require('./_store');

const STORE_NAME = 'images';
const SAFE_ID_RE = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/;

exports.handler = async (event) => {
  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id || !SAFE_ID_RE.test(id)) {
    return { statusCode: 400, body: 'Thiếu hoặc sai id ảnh' };
  }

  let store;
  try {
    store = getStoreSafe(STORE_NAME);
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
  const result = await store.getWithMetadata(id, { type: 'arrayBuffer' });
  if (!result) {
    return { statusCode: 404, body: 'Không tìm thấy ảnh' };
  }

  const contentType = (result.metadata && result.metadata.contentType) || 'application/octet-stream';
  return {
    statusCode: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    body: Buffer.from(result.data).toString('base64'),
    isBase64Encoded: true,
  };
};
