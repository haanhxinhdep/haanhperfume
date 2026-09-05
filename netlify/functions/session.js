// Cho trang /admin biết phiên đăng nhập hiện tại còn hạn hay không,
// để không bắt gõ lại mật khẩu mỗi lần mở trang trong vòng 30 ngày.
const { isAuthenticated } = require('./_auth');

exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ authenticated: isAuthenticated(event) }),
  };
};
