// Helper dùng chung để lấy Netlify Blobs store.
// Trên 1 số site, Netlify không tự inject được context cho Blobs (lỗi
// "MissingBlobsEnvironmentError"), nên cần fallback sang cấu hình thủ công
// bằng NETLIFY_SITE_ID + NETLIFY_API_TOKEN (đọc README/HUONG_DAN_ADMIN.md để biết
// cách lấy 2 giá trị này).
const { getStore } = require('@netlify/blobs');

function getStoreSafe(name) {
  try {
    return getStore(name);
  } catch (e) {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_API_TOKEN;
    if (!siteID || !token) {
      const err = new Error(
        'Netlify Blobs chưa được cấu hình. Vào Netlify → Site settings → Environment variables, ' +
        'thêm NETLIFY_SITE_ID (Site configuration → General → Site details → Site ID) và ' +
        'NETLIFY_API_TOKEN (User settings → Applications → New access token), rồi deploy lại.'
      );
      err.statusCode = 500;
      throw err;
    }
    return getStore({ name, siteID, token });
  }
}

module.exports = { getStoreSafe };
