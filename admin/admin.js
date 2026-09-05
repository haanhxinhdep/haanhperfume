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
    pendingImageDataUrl: null, // ảnh mới chọn trong modal, chưa upload
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
  var imageInput = document.getElementById('image-input');
  var fieldName = document.getElementById('field-name');
  var fieldDesc = document.getElementById('field-desc');
  var fieldLink = document.getElementById('field-link');
  var fieldCategory = document.getElementById('field-category');
  var formError = document.getElementById('form-error');
  var cancelBtn = document.getElementById('cancel-btn');
  var saveBtn = document.getElementById('save-btn');

  var PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#F7F0E3"/></svg>'
  );

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

  function productsInActiveCategory() {
    return state.products
      .filter(function (p) { return p.category === state.activeCategory; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
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

  // ---- Reorder ----
  function moveProduct(id, delta) {
    var items = productsInActiveCategory();
    var idx = items.findIndex(function (p) { return p.id === id; });
    var swapIdx = idx + delta;
    if (idx === -1 || swapIdx < 0 || swapIdx >= items.length) return;
    var a = items[idx], b = items[swapIdx];
    var tmp = a.order; a.order = b.order; b.order = tmp;
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
    formError.hidden = true;
    imageInput.value = '';

    if (id) {
      var p = state.products.find(function (x) { return x.id === id; });
      modalTitle.textContent = 'Sửa sản phẩm';
      fieldName.value = p.name || '';
      fieldDesc.value = p.desc || '';
      fieldLink.value = p.link || '';
      fieldCategory.value = p.category;
      imagePreview.src = p.image || PLACEHOLDER_IMG;
    } else {
      modalTitle.textContent = 'Thêm sản phẩm';
      fieldName.value = '';
      fieldDesc.value = '';
      fieldLink.value = '';
      fieldCategory.value = state.activeCategory;
      imagePreview.src = PLACEHOLDER_IMG;
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
    var reader = new FileReader();
    reader.onload = function () {
      state.pendingImageDataUrl = reader.result;
      imagePreview.src = reader.result;
    };
    reader.readAsDataURL(file);
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
    var category = fieldCategory.value;

    if (state.editingId) {
      var p = state.products.find(function (x) { return x.id === state.editingId; });
      p.name = name;
      p.desc = desc;
      p.link = link;
      if (uploadedImageUrl) p.image = uploadedImageUrl;
      if (p.category !== category) {
        p.category = category;
        p.order = nextOrderFor(category);
      }
    } else {
      state.products.push({
        id: newId(name),
        name: name,
        desc: desc,
        link: link,
        image: uploadedImageUrl || '',
        category: category,
        order: nextOrderFor(category),
      });
    }
  }

  function nextOrderFor(category) {
    var max = 0;
    state.products.forEach(function (p) {
      if (p.category === category && (p.order || 0) > max) max = p.order;
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
