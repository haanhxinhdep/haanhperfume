(function () {
  'use strict';

  var CATEGORY_LABELS = {
    bestsellers: 'Bán chạy nhất',
    nu: 'Nước hoa nữ',
    nam: 'Nước hoa nam',
    unisex: 'Unisex',
  };

  var state = {
    products: [],
    activeCategory: 'bestsellers',
    editingId: null,
    pendingImageDataUrl: null, // ảnh chọn từ máy, chưa upload lên server
    resolvedImageUrl: null, // ảnh dán từ link, server đã tải & lưu xong, dùng luôn
  };

  // ---- DOM refs ----
  var loginScreen = document.getElementById('login-screen');
  var loginForm = document.getElementById('login-form');
  var loginPassword = document.getElementById('login-password');
  var loginError = document.getElementById('login-error');

  var dashboard = document.getElementById('dashboard');
  var logoutBtn = document.getElementById('logout-btn');
  var saveStatus = document.getElementById('save-status');

  var catTabs = document.getElementById('cat-tabs');
  var productList = document.getElementById('product-list');
  var productCount = document.getElementById('product-count');
  var emptyState = document.getElementById('empty-state');
  var addBtn = document.getElementById('add-btn');

  var modalOverlay = document.getElementById('modal-overlay');
  var productForm = document.getElementById('product-form');
  var modalTitle = document.getElementById('modal-title');
  var imagePreview = document.getElementById('image-preview');
  var imagePlaceholder = document.getElementById('image-placeholder');
  var imageInput = document.getElementById('image-input');
  var imageUrlInput = document.getElementById('image-url-input');
  var imageUrlBtn = document.getElementById('image-url-btn');
  var fieldName = document.getElementById('field-name');
  var fieldDesc = document.getElementById('field-desc');
  var fieldLink = document.getElementById('field-link');
  var categoryChecks = document.getElementById('category-checks');
  var formError = document.getElementById('form-error');
  var cancelBtn = document.getElementById('cancel-btn');
  var saveBtn = document.getElementById('save-btn');

  var PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#F7F0E3"/></svg>'
  );

  // Đổi ảnh xem trước trong modal: có ảnh thì hiện ảnh, không có thì hiện icon placeholder.
  function setPreview(url) {
    if (url) {
      imagePreview.src = url;
      imagePreview.hidden = false;
      imagePlaceholder.hidden = true;
    } else {
      imagePreview.hidden = true;
      imagePreview.removeAttribute('src');
      imagePlaceholder.hidden = false;
    }
  }

  function getCheckedCategories() {
    return Array.prototype.slice.call(categoryChecks.querySelectorAll('input:checked')).map(function (cb) { return cb.value; });
  }

  function setCheckedCategories(categories) {
    var set = {};
    (categories || []).forEach(function (c) { set[c] = true; });
    categoryChecks.querySelectorAll('input').forEach(function (cb) { cb.checked = !!set[cb.value]; });
  }

  // ---- Helpers ----
  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function slugify(str) {
    var noDiacritics = String(str)
      .toLowerCase()
      .replace(/đ/g, 'd') // đ -> d
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, ''); // bỏ dấu
    return noDiacritics.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'san-pham';
  }

  function newId(name) {
    var base = slugify(name);
    var suffix = (window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID().slice(0, 8)
      : Date.now().toString(36);
    return base + '-' + suffix;
  }

  function fetchJson(url, options) {
    return fetch(url, Object.assign({ credentials: 'same-origin' }, options || {}))
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) {
            var err = new Error(data.error || ('Lỗi HTTP ' + res.status));
            err.status = res.status;
            throw err;
          }
          return data;
        });
      });
  }

  // ---- Auth ----
  function checkSession() {
    fetchJson('/.netlify/functions/session')
      .then(function (data) {
        if (data.authenticated) {
          showDashboard();
        } else {
          showLogin();
        }
      })
      .catch(showLogin);
  }

  function showLogin() {
    loginScreen.hidden = false;
    dashboard.hidden = true;
    loginPassword.value = '';
    loginPassword.focus();
  }

  function showDashboard() {
    loginScreen.hidden = true;
    dashboard.hidden = false;
    loadProducts();
  }

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    loginError.hidden = true;
    var submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    fetchJson('/.netlify/functions/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: loginPassword.value }),
    })
      .then(showDashboard)
      .catch(function (err) {
        loginError.textContent = err.message || 'Đăng nhập thất bại';
        loginError.hidden = false;
      })
      .finally(function () { submitBtn.disabled = false; });
  });

  logoutBtn.addEventListener('click', function () {
    fetchJson('/.netlify/functions/logout', { method: 'POST' }).finally(showLogin);
  });

  // ---- Load & render products ----
  function loadProducts() {
    productList.innerHTML = '<div class="empty-state">Đang tải...</div>';
    fetchJson('/.netlify/functions/products')
      .then(function (data) {
        state.products = (data && data.products) || [];
        renderList();
      })
      .catch(function (err) {
        productList.innerHTML = '';
        emptyState.hidden = false;
        emptyState.textContent = 'Không tải được danh sách sản phẩm: ' + (err.message || '');
      });
  }

  function orderOf(p, category) {
    return (p.order && p.order[category]) || 0;
  }

  function productsInActiveCategory() {
    var cat = state.activeCategory;
    return state.products
      .filter(function (p) { return Array.isArray(p.categories) && p.categories.includes(cat); })
      .sort(function (a, b) { return orderOf(a, cat) - orderOf(b, cat); });
  }

  function renderList() {
    var items = productsInActiveCategory();
    productCount.textContent = items.length + ' sản phẩm trong "' + CATEGORY_LABELS[state.activeCategory] + '"';

    if (!items.length) {
      productList.innerHTML = '';
      emptyState.hidden = false;
      emptyState.textContent = 'Chưa có sản phẩm nào trong danh mục này.';
      return;
    }
    emptyState.hidden = true;

    productList.innerHTML = items.map(function (p, i) {
      return '' +
        '<div class="product-card" data-id="' + escapeHtml(p.id) + '">' +
          '<img class="product-card-img" src="' + escapeHtml(p.image || PLACEHOLDER_IMG) + '" alt="' + escapeHtml(p.name) + '">' +
          '<div class="product-card-body">' +
            '<div class="product-card-name">' + escapeHtml(p.name) + '</div>' +
            '<div class="product-card-desc">' + escapeHtml(p.desc || '') + '</div>' +
            '<div class="product-card-link">' + escapeHtml(p.link) + '</div>' +
            '<div class="product-card-cats">' + (p.categories || []).map(function (c) {
              return '<span class="product-card-cat">' + escapeHtml(CATEGORY_LABELS[c] || c) + '</span>';
            }).join('') + '</div>' +
            '<div class="product-card-actions">' +
              '<button class="btn-icon" data-action="up" ' + (i === 0 ? 'disabled' : '') + ' title="Lên">↑</button>' +
              '<button class="btn-icon" data-action="down" ' + (i === items.length - 1 ? 'disabled' : '') + ' title="Xuống">↓</button>' +
              '<button class="btn-icon" data-action="edit" title="Sửa">✎</button>' +
              '<button class="btn-icon danger" data-action="delete" title="Xoá">🗑</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  productList.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;
    var card = e.target.closest('.product-card');
    var id = card.getAttribute('data-id');
    var action = btn.getAttribute('data-action');

    if (action === 'edit') { openModal(id); }
    else if (action === 'delete') { deleteProduct(id); }
    else if (action === 'up') { moveProduct(id, -1); }
    else if (action === 'down') { moveProduct(id, 1); }
  });

  catTabs.addEventListener('click', function (e) {
    var btn = e.target.closest('.cat-tab');
    if (!btn) return;
    catTabs.querySelectorAll('.cat-tab').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    state.activeCategory = btn.getAttribute('data-cat');
    renderList();
  });

  // ---- Reorder (chỉ đổi thứ tự trong danh mục đang xem, không ảnh hưởng danh mục khác) ----
  function moveProduct(id, delta) {
    var cat = state.activeCategory;
    var items = productsInActiveCategory();
    var idx = items.findIndex(function (p) { return p.id === id; });
    var swapIdx = idx + delta;
    if (idx === -1 || swapIdx < 0 || swapIdx >= items.length) return;
    var a = items[idx], b = items[swapIdx];
    var tmp = a.order[cat]; a.order[cat] = b.order[cat]; b.order[cat] = tmp;
    renderList();
    persist();
  }

  // ---- Delete ----
  function deleteProduct(id) {
    var product = state.products.find(function (p) { return p.id === id; });
    if (!product) return;
    if (!window.confirm('Xoá sản phẩm "' + product.name + '"? Không thể hoàn tác.')) return;
    state.products = state.products.filter(function (p) { return p.id !== id; });
    renderList();
    persist();
  }

  // ---- Modal (add / edit) ----
  function openModal(id) {
    state.editingId = id || null;
    state.pendingImageDataUrl = null;
    state.resolvedImageUrl = null;
    formError.hidden = true;
    imageInput.value = '';
    imageUrlInput.value = '';

    if (id) {
      var p = state.products.find(function (x) { return x.id === id; });
      modalTitle.textContent = 'Sửa sản phẩm';
      fieldName.value = p.name || '';
      fieldDesc.value = p.desc || '';
      fieldLink.value = p.link || '';
      setCheckedCategories(p.categories);
      setPreview(p.image || null);
    } else {
      modalTitle.textContent = 'Thêm sản phẩm';
      fieldName.value = '';
      fieldDesc.value = '';
      fieldLink.value = '';
      setCheckedCategories([state.activeCategory]);
      setPreview(null);
    }
    modalOverlay.hidden = false;
    fieldName.focus();
  }

  function closeModal() {
    modalOverlay.hidden = true;
  }

  cancelBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeModal();
  });

  imageInput.addEventListener('change', function () {
    var file = imageInput.files && imageInput.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      formError.textContent = 'Ảnh quá lớn (tối đa 5MB).';
      formError.hidden = false;
      imageInput.value = '';
      return;
    }
    state.resolvedImageUrl = null;
    imageUrlInput.value = '';
    var reader = new FileReader();
    reader.onload = function () {
      state.pendingImageDataUrl = reader.result;
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  });

  imageUrlBtn.addEventListener('click', function () {
    var url = imageUrlInput.value.trim();
    if (!url) {
      formError.textContent = 'Vui lòng dán link ảnh trước.';
      formError.hidden = false;
      return;
    }
    formError.hidden = true;
    imageUrlBtn.disabled = true;
    imageUrlBtn.textContent = 'Đang tải ảnh...';
    fetchJson('/.netlify/functions/upload-image-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url }),
    })
      .then(function (data) {
        state.pendingImageDataUrl = null;
        imageInput.value = '';
        state.resolvedImageUrl = data.url;
        setPreview(data.url);
      })
      .catch(function (err) {
        formError.textContent = err.message || 'Không tải được ảnh từ link này.';
        formError.hidden = false;
      })
      .finally(function () {
        imageUrlBtn.disabled = false;
        imageUrlBtn.textContent = 'Dùng ảnh này';
      });
  });

  productForm.addEventListener('submit', function (e) {
    e.preventDefault();
    formError.hidden = true;

    var name = fieldName.value.trim();
    var link = fieldLink.value.trim();
    if (!name || !link) {
      formError.textContent = 'Vui lòng nhập tên sản phẩm và link Shopee.';
      formError.hidden = false;
      return;
    }
    if (!getCheckedCategories().length) {
      formError.textContent = 'Vui lòng chọn ít nhất 1 danh mục.';
      formError.hidden = false;
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Đang lưu...';

    uploadImageIfNeeded()
      .then(function (imageUrl) {
        applyFormToState(imageUrl);
        closeModal();
        renderList();
        return persist();
      })
      .catch(function (err) {
        formError.textContent = err.message || 'Có lỗi xảy ra, vui lòng thử lại.';
        formError.hidden = false;
      })
      .finally(function () {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Lưu';
      });
  });

  function uploadImageIfNeeded() {
    // Ảnh dán từ link: server đã tải & lưu ngay lúc bấm "Dùng ảnh này", dùng luôn không cần upload lại.
    if (state.resolvedImageUrl) return Promise.resolve(state.resolvedImageUrl);
    // Ảnh chọn từ máy: chỉ upload lúc bấm Lưu.
    if (!state.pendingImageDataUrl) return Promise.resolve(null);
    return fetchJson('/.netlify/functions/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl: state.pendingImageDataUrl }),
    }).then(function (data) { return data.url; });
  }

  function applyFormToState(uploadedImageUrl) {
    var name = fieldName.value.trim();
    var desc = fieldDesc.value.trim();
    var link = fieldLink.value.trim();
    var categories = getCheckedCategories();

    if (state.editingId) {
      var p = state.products.find(function (x) { return x.id === state.editingId; });
      p.name = name;
      p.desc = desc;
      p.link = link;
      if (uploadedImageUrl) p.image = uploadedImageUrl;
      if (!p.order) p.order = {};
      if (!Array.isArray(p.categories)) p.categories = [];
      // Danh mục mới thêm vào -> xếp cuối danh sách của danh mục đó.
      categories.forEach(function (c) {
        if (!p.categories.includes(c)) p.order[c] = nextOrderFor(c);
      });
      p.categories = categories;
    } else {
      var order = {};
      categories.forEach(function (c) { order[c] = nextOrderFor(c); });
      state.products.push({
        id: newId(name),
        name: name,
        desc: desc,
        link: link,
        image: uploadedImageUrl || '',
        categories: categories,
        order: order,
      });
    }
  }

  function nextOrderFor(category) {
    var max = 0;
    state.products.forEach(function (p) {
      var o = orderOf(p, category);
      if (Array.isArray(p.categories) && p.categories.includes(category) && o > max) max = o;
    });
    return max + 1;
  }

  // ---- Persist to server ----
  var saveStatusTimer = null;
  function persist() {
    saveStatus.textContent = 'Đang lưu...';
    saveStatus.className = 'save-status saving';
    return fetchJson('/.netlify/functions/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: state.products }),
    })
      .then(function () {
        saveStatus.textContent = 'Đã lưu ✓';
        saveStatus.className = 'save-status';
        clearTimeout(saveStatusTimer);
        saveStatusTimer = setTimeout(function () { saveStatus.textContent = ''; }, 2500);
      })
      .catch(function (err) {
        saveStatus.textContent = 'Lỗi lưu: ' + (err.message || 'thử lại');
        saveStatus.className = 'save-status error';
        throw err;
      });
  }

  addBtn.addEventListener('click', function () { openModal(null); });

  checkSession();
})();
