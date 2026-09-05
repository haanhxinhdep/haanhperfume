function switchTab(id,btn){
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  btn.classList.add('active');
}

// ---- Sản phẩm: nạp từ Netlify Function, không còn nhúng cứng trong HTML ----
// Sửa/thêm/xoá sản phẩm ở /admin sẽ cập nhật ngay tại đây (không cần build lại site).

var SHOPEE_ICON = '<svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>Xem trên Shopee';

function escapeHtml(str){
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function bestsellerCardHtml(item, rank){
  var name = escapeHtml(item.name);
  return '<a class="bs-card" href="' + escapeHtml(item.link) + '" target="_blank" rel="noopener">' +
    '<div class="bs-img">' +
      '<img src="' + escapeHtml(item.image || '') + '" alt="' + name + '" loading="lazy">' +
      '<div class="bs-rank bs-rank-' + (rank === 1 ? '1' : 'n') + '">' + rank + '</div>' +
    '</div>' +
    '<div class="bs-body">' +
      '<div class="bs-name">' + name + '</div>' +
      '<div class="bs-note">' + escapeHtml(item.desc) + '</div>' +
      '<div class="bs-link">' + SHOPEE_ICON + '</div>' +
    '</div>' +
  '</a>';
}

function scentCardHtml(item){
  var name = escapeHtml(item.name);
  return '<a class="scent-card" href="' + escapeHtml(item.link) + '" target="_blank" rel="noopener">' +
    '<div class="scent-img">' +
      '<img src="' + escapeHtml(item.image || '') + '" alt="' + name + '" loading="lazy">' +
      '<div class="overlay"><div class="overlay-name">' + name + '</div></div>' +
    '</div>' +
    '<div class="scent-body">' +
      '<div class="scent-name">' + name + '</div>' +
      '<div class="scent-desc">' + escapeHtml(item.desc) + '</div>' +
      '<div class="scent-cta">' + SHOPEE_ICON + '</div>' +
    '</div>' +
  '</a>';
}

function orderOf(p, category){
  return (p.order && p.order[category]) || 0;
}

function inCategory(p, category){
  return Array.isArray(p.categories) && p.categories.indexOf(category) !== -1;
}

function byOrderIn(category){
  return function(a, b){ return orderOf(a, category) - orderOf(b, category); };
}

function loadProducts(){
  var bestsellersRoot = document.getElementById('bestsellers-root');
  var grids = {
    nu: document.getElementById('scent-grid-nu'),
    nam: document.getElementById('scent-grid-nam'),
    unisex: document.getElementById('scent-grid-unisex')
  };

  fetch('/.netlify/functions/products')
    .then(function(res){
      if (!res.ok) { throw new Error('HTTP ' + res.status); }
      return res.json();
    })
    .then(function(data){
      var products = (data && data.products) || [];

      var bestsellers = products.filter(function(p){ return inCategory(p, 'bestsellers'); }).sort(byOrderIn('bestsellers'));
      if (bestsellersRoot) {
        bestsellersRoot.innerHTML = bestsellers.length
          ? bestsellers.map(function(item, i){ return bestsellerCardHtml(item, i + 1); }).join('')
          : '<div class="empty-note">Chưa có sản phẩm bán chạy nào.</div>';
      }

      ['nu', 'nam', 'unisex'].forEach(function(cat){
        var grid = grids[cat];
        if (!grid) { return; }
        var items = products.filter(function(p){ return inCategory(p, cat); }).sort(byOrderIn(cat));
        grid.innerHTML = items.length
          ? items.map(scentCardHtml).join('')
          : '<div class="empty-note">Chưa có sản phẩm nào.</div>';
      });
    })
    .catch(function(){
      var errorNote = '<div class="empty-note">Không tải được sản phẩm, vui lòng thử tải lại trang.</div>';
      if (bestsellersRoot) { bestsellersRoot.innerHTML = errorNote; }
      Object.keys(grids).forEach(function(cat){
        if (grids[cat]) { grids[cat].innerHTML = errorNote; }
      });
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadProducts);
} else {
  loadProducts();
}
