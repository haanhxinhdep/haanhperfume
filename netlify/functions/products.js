const { getStore } = require('@netlify/blobs');
const { isAuthenticated } = require('./_auth');

const STORE_NAME = 'shop';
const KEY = 'products.json';
const CATEGORIES = ['bestsellers', 'nu', 'nam', 'unisex'];

// Dữ liệu 12 sản phẩm đang có trên site — dùng làm mặc định cho tới khi
// admin lưu thay đổi đầu tiên (khi đó dữ liệu thật sẽ được ghi vào Netlify Blobs).
const DEFAULT_PRODUCTS = [
  { id: 'aire-sutileza-edt', name: 'Aire Sutileza EDT', desc: 'Vẻ đẹp tinh khôi của sự tinh tế', link: 'https://s.shopee.vn/3g17ly5l1M', image: '/assets/products/aire-sutileza-edt.jpg', category: 'bestsellers', order: 1 },
  { id: 'musk-kashmir', name: 'Musk Kashmir', desc: 'Hương xạ tinh khiết, gỗ thơm lâu', link: 'https://s.shopee.vn/3g17m3QDXr', image: '/assets/products/musk-kashmir.jpg', category: 'bestsellers', order: 2 },
  { id: 'montblanc-signature', name: 'Montblanc Signature', desc: 'Thơm mùi em bé, vani sữa', link: 'https://s.shopee.vn/LkfnwThhK', image: '/assets/products/montblanc-signature.jpg', category: 'bestsellers', order: 3 },
  { id: 'tong-hop-goc-nuoc-hoa', name: 'Tổng hợp gốc nước hoa', desc: 'Khám phá bộ sưu tập đầy đủ', link: 'https://shopee.vn/T%E1%BB%95ng-h%E1%BB%A3p-g%E1%BB%91c-n%C6%B0%E1%BB%9Bc-hoa-i.802122923.55007793868', image: '/assets/products/tong-hop-goc-nuoc-hoa.jpg', category: 'bestsellers', order: 4 },
  { id: 'pure-musc-for-her', name: 'Pure Musc For Her', desc: 'Hương phấn thanh lịch', link: 'https://shopee.vn/N%C6%B0%E1%BB%9Bc-Hoa-N%E1%BB%AF-Pure-Musc-For-Her-chi%E1%BA%BFt-10ml-i.802122923.16892644832', image: '/assets/products/pure-musc-for-her.jpg', category: 'nu', order: 1 },
  { id: 'bubble-bath', name: 'Bubble Bath', desc: 'Thơm đáng yêu, sạch sẽ, tinh tế', link: 'https://shopee.vn/Chi%E1%BA%BFt-10ml-Bubble-Bath-s%E1%BA%A1ch-s%E1%BA%BD-tinh-t%E1%BA%BF-H%C3%A0-Anh-Perfume-i.802122923.25822407140', image: '/assets/products/bubble-bath.jpg', category: 'nu', order: 2 },
  { id: 'signorina-edp', name: 'Signorina EDP', desc: 'Tiểu thư, ngọt ngào siêu dễ thương', link: 'https://shopee.vn/N%C6%B0%E1%BB%9Bc-hoa-chi%E1%BA%BFt-10ml-Signorina-edp-ti%E1%BB%83u-th%C6%B0-ng%E1%BB%8Dt-ng%C3%A0o-si%C3%AAu-d%E1%BB%85-th%C6%B0%C6%A1ng-i.802122923.25714978676', image: '/assets/products/signorina-edp.jpg', category: 'nu', order: 3 },
  { id: 'la-nuit-de-lhomme', name: "La Nuit De L'Homme", desc: 'Vibe nam tính, ấm áp', link: 'https://shopee.vn/10ml-n%C6%B0%E1%BB%9Bc-hoa-nam-La-Nuit-De-L-Homme-nam-t%C3%ADnh-cu%E1%BB%91n-h%C3%BAt-i.802122923.29605898487', image: '/assets/products/la-nuit-de-lhomme.jpg', category: 'nam', order: 1 },
  { id: 'aqva-pour-homme', name: 'Aqva Pour Homme', desc: 'Hương biển tươi mát, mạnh mẽ', link: 'https://shopee.vn/Chi%E1%BA%BFt-10ml-Aqva-Pour-Homme-h%C6%B0%C6%A1ng-bi%E1%BB%83n-t%C6%B0%C6%A1i-m%C3%A1t-nam-t%C3%ADnh-m%E1%BA%A1nh-m%E1%BA%BD-i.802122923.24812237363', image: '/assets/products/aqva-pour-homme.jpg', category: 'nam', order: 2 },
  { id: 'wood-sage-sea-salt', name: 'Wood Sage & Sea Salt', desc: 'Mùi biển dễ chịu, tự nhiên', link: 'https://shopee.vn/chi%E1%BA%BFt-10ml-Wood-Sage-Sea-Salt-m%C3%B9i-bi%E1%BB%83n-d%E1%BB%85-ch%E1%BB%8Bu-i.802122923.57553107731', image: '/assets/products/wood-sage-sea-salt.jpg', category: 'unisex', order: 1 },
  { id: 'you-or-someone-like-you', name: 'You Or Someone Like You', desc: 'Bạc hà, hoa hồng mát mẻ', link: 'https://shopee.vn/chi%E1%BA%BFt-10ml-n%C6%B0%E1%BB%9Bc-hoa-you-or-someone-like-you-b%E1%BA%A1c-h%C3%A0-hoa-h%E1%BB%93ng-m%C3%A1t-m%E1%BA%BB-cho-b%E1%BA%A3o-b%C3%ACnh-i.802122923.28104575126', image: '/assets/products/you-or-someone-like-you.jpg', category: 'unisex', order: 2 },
  { id: 'the-yulong-edt', name: 'The YuLong EDT', desc: 'Hương trà tinh tế, sang trọng', link: 'https://shopee.vn/Chi%E1%BA%BFt-10ml-n%C6%B0%E1%BB%9Bc-hoa-h%C6%B0%C6%A1ng-tr%C3%A0-The-YuLong-EDT-sang-tr%E1%BB%8Dng-tinh-t%E1%BA%BF-H%C3%A0-Anh-Perfume-i.802122923.57456817570', image: '/assets/products/the-yulong-edt.jpg', category: 'unisex', order: 3 },
];

exports.handler = async (event) => {
  const store = getStore(STORE_NAME);

  if (event.httpMethod === 'GET') {
    let data = null;
    try {
      data = await store.get(KEY, { type: 'json' });
    } catch (e) {
      // Nếu Blobs chưa sẵn sàng vì lý do gì đó, vẫn trả về dữ liệu mặc định thay vì lỗi trắng trang.
    }
    const products = data && Array.isArray(data.products) ? data.products : DEFAULT_PRODUCTS;
    return json(200, { products });
  }

  if (event.httpMethod === 'POST') {
    if (!isAuthenticated(event)) {
      return json(401, { error: 'Chưa đăng nhập hoặc phiên đã hết hạn' });
    }

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return json(400, { error: 'Dữ liệu không hợp lệ' });
    }

    if (!Array.isArray(body.products)) {
      return json(400, { error: 'Thiếu danh sách sản phẩm' });
    }

    for (const p of body.products) {
      if (!p || typeof p.name !== 'string' || !p.name.trim()) {
        return json(400, { error: 'Mỗi sản phẩm cần có tên' });
      }
      if (typeof p.link !== 'string' || !p.link.trim()) {
        return json(400, { error: `Sản phẩm "${p.name}" cần có link Shopee` });
      }
      if (!CATEGORIES.includes(p.category)) {
        return json(400, { error: `Sản phẩm "${p.name}" có danh mục không hợp lệ` });
      }
    }

    await store.setJSON(KEY, { products: body.products });
    return json(200, { ok: true });
  }

  return json(405, { error: 'Method not allowed' });
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(obj),
  };
}
