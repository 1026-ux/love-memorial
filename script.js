(function () {
  'use strict';

  var STORAGE_KEYS = {
    startDate: 'love_memorial_start_date',
    photos: 'love_memorial_photos',
    categories: 'love_memorial_categories',
    goals: 'love_memorial_goals',
    messages: 'love_memorial_messages',
    about: 'love_memorial_about',
    locations: 'love_memorial_locations',
    reminderSettings: 'love_memorial_reminder_settings'
  };

  var MAX_PHOTO_SIZE = 600;
  var PHOTO_QUALITY = 0.75;
  var SYNC_PHOTO_SIZE = 280;
  var SYNC_PHOTO_QUALITY = 0.5;

  var ROOM_ID_KEY = 'love_memorial_roomId';
  var firebaseApp = null;
  var firebaseDb = null;
  var cloudData = {};
  var currentGoalFilter = 'all';

  function isFirebaseEnabled() {
    var c = typeof window !== 'undefined' && window.FIREBASE_CONFIG;
    return !!(c && c.projectId && c.projectId !== 'YOUR_PROJECT_ID');
  }

  function isSyncMode() {
    return isFirebaseEnabled() && getRoomId();
  }

  function getRoomId() {
    return localStorage.getItem(ROOM_ID_KEY) || '';
  }

  function setRoomId(id) {
    if (id) localStorage.setItem(ROOM_ID_KEY, id);
  }

  function initFirebaseIfNeeded() {
    if (!isFirebaseEnabled() || firebaseApp) return true;
    try {
      firebaseApp = firebase.initializeApp(window.FIREBASE_CONFIG);
      firebaseDb = firebase.firestore();
      return true;
    } catch (e) {
      return false;
    }
  }

  function cloudDocRef() {
    if (!firebaseDb || !getRoomId()) return null;
    return firebaseDb.collection('rooms').doc(getRoomId());
  }

  function cloudPhotosRef() {
    var ref = cloudDocRef();
    return ref ? ref.collection('photos') : null;
  }

  function ensureCloudDefaults() {
    if (!cloudData.photos) cloudData.photos = [];
    if (!cloudData.categories) cloudData.categories = [];
    if (!cloudData.goals) cloudData.goals = [];
    if (!cloudData.messages) cloudData.messages = [];
    if (!cloudData.locations) cloudData.locations = [];
    if (!cloudData.about) cloudData.about = {};
    if (!cloudData.reminderSettings) cloudData.reminderSettings = {};
  }

  function refreshAll() {
    renderCountdown();
    syncCategorySelect();
    renderAlbum();
    renderGoals(currentGoalFilter);
    renderMessages();
    renderLocations();
    var about = getAbout();
    if (byId('about-story')) byId('about-story').value = about.story || '';
    if (byId('about-name1')) byId('about-name1').value = about.name1 || '';
    if (byId('about-name2')) byId('about-name2').value = about.name2 || '';
    var s = getReminderSettings();
    if (byId('reminder-advance')) byId('reminder-advance').value = String(s.advanceDays !== undefined ? s.advanceDays : 0);
    if (byId('reminder-daily-time')) byId('reminder-daily-time').value = s.dailyTime || '20:00';
    if (byId('reminder-daily-on')) byId('reminder-daily-on').checked = !!s.dailyOn;
  }

  function startCloudListen() {
    var ref = cloudDocRef();
    if (!ref) return;
    ref.onSnapshot(function (snap) {
      var data = snap.exists() ? snap.data() : {};
      cloudData.startDate = data.startDate;
      cloudData.categories = data.categories;
      cloudData.goals = data.goals;
      cloudData.messages = data.messages;
      cloudData.locations = data.locations;
      cloudData.about = data.about;
      cloudData.reminderSettings = data.reminderSettings;
      ensureCloudDefaults();
      refreshAll();
    }, function (err) { console.warn('Firestore listen error', err); });

    var photosRef = cloudPhotosRef();
    if (photosRef) {
      photosRef.onSnapshot(function (snap) {
        cloudData.photos = snap.docs.map(function (doc) {
          var d = doc.data();
          return { id: doc.id, data: d.data, category: d.category || '', caption: d.caption || '', createdAt: d.createdAt || 0 };
        });
        renderAlbum();
        syncCategorySelect();
      }, function (err) { console.warn('Firestore photos listen error', err); });
    }
  }

  function writeCloud(key, value) {
    var ref = cloudDocRef();
    if (!ref) return Promise.resolve();
    return ref.set({ [key]: value }, { merge: true });
  }

  function writeInitialRoomDoc() {
    var ref = cloudDocRef();
    if (!ref) return Promise.resolve();
    var initial = {
      categories: getJSON(STORAGE_KEYS.categories, []) || [],
      goals: getJSON(STORAGE_KEYS.goals, []) || [],
      messages: getJSON(STORAGE_KEYS.messages, []) || [],
      locations: getJSON(STORAGE_KEYS.locations, []) || [],
      about: getJSON(STORAGE_KEYS.about, {}) || {},
      reminderSettings: getJSON(STORAGE_KEYS.reminderSettings, {}) || {},
      startDate: localStorage.getItem(STORAGE_KEYS.startDate) || null
    };
    return ref.set(initial, { merge: true });
  }

  function ensureCloudDefaults() {
    if (!cloudData.photos) cloudData.photos = [];
    if (!cloudData.categories) cloudData.categories = [];
    if (!cloudData.goals) cloudData.goals = [];
    if (!cloudData.messages) cloudData.messages = [];
    if (!cloudData.locations) cloudData.locations = [];
    if (!cloudData.about) cloudData.about = {};
    if (!cloudData.reminderSettings) cloudData.reminderSettings = {};
  }

  function initPairBanner() {
    var banner = byId('pair-banner');
    var inner = banner ? banner.querySelector('.pair-banner-inner') : null;
    var success = byId('pair-success');
    var codeDisplay = byId('pair-code-display');
    if (!banner) return;

    if (!isFirebaseEnabled()) {
      banner.style.display = 'block';
      if (inner) {
        inner.innerHTML = '<span class="pair-label">与对象同步：</span>' +
          '<span class="pair-warn">未检测到 Firebase 配置。请用 http://localhost 或部署后的网址打开本页，并确认 firebase-config.js 与 index.html 在同一目录且已填写 projectId。</span>' +
          '<button type="button" class="pair-close" aria-label="关闭">×</button>';
        inner.style.display = 'block';
        var closeBtn = inner.querySelector('.pair-close');
        if (closeBtn) closeBtn.addEventListener('click', function () { banner.style.display = 'none'; document.body.classList.remove('pair-banner-visible'); });
      }
      if (success) success.style.display = 'none';
      document.body.classList.add('pair-banner-visible');
      showPairMoreCardOnly('未检测到 Firebase 配置，请用电脑或部署后的网址打开本页。');
      return;
    }

    try {
      initFirebaseIfNeeded();
    } catch (e) {
      console.error('Firebase 初始化失败', e);
      banner.style.display = 'block';
      if (inner) {
        inner.innerHTML = '<span class="pair-label">与对象同步：</span>' +
          '<span class="pair-warn">Firebase 初始化失败：' + (e && e.message ? e.message : String(e)) + '</span>' +
          '<button type="button" class="pair-close" aria-label="关闭">×</button>';
        inner.style.display = 'block';
        var closeBtn = inner.querySelector('.pair-close');
        if (closeBtn) closeBtn.addEventListener('click', function () { banner.style.display = 'none'; document.body.classList.remove('pair-banner-visible'); });
      }
      if (success) success.style.display = 'none';
      document.body.classList.add('pair-banner-visible');
      initPairMore(true);
      return;
    }

    var roomId = getRoomId();
    if (roomId) {
      if (banner) banner.style.display = 'block';
      if (inner) inner.style.display = 'none';
      if (success) success.style.display = 'block';
      if (codeDisplay) codeDisplay.textContent = roomId;
      document.body.classList.add('pair-banner-visible');
      startCloudListen();
      bindPairButtons(banner, inner, success, codeDisplay);
      initPairMore();
      return;
    }

    banner.style.display = 'block';
    if (inner) inner.style.display = 'block';
    if (success) success.style.display = 'none';
    document.body.classList.add('pair-banner-visible');
    bindPairButtons(banner, inner, success, codeDisplay);
    initPairMore();
  }

  function updatePairUI() {
    var roomId = getRoomId();
    var banner = byId('pair-banner');
    var inner = banner ? banner.querySelector('.pair-banner-inner') : null;
    var success = byId('pair-success');
    var codeDisplay = byId('pair-code-display');
    if (banner && inner && success && codeDisplay) {
      if (roomId) {
        inner.style.display = 'none';
        success.style.display = 'block';
        codeDisplay.textContent = roomId;
      } else {
        inner.style.display = 'block';
        success.style.display = 'none';
      }
    }
    var moreCard = byId('pair-more-card');
    var moreForm = byId('pair-more-form');
    var moreSuccess = byId('pair-more-success');
    var codeDisplayMore = byId('pair-code-display-more');
    if (moreCard && moreForm && moreSuccess && codeDisplayMore) {
      if (roomId) {
        moreForm.style.display = 'none';
        moreSuccess.style.display = 'block';
        codeDisplayMore.textContent = roomId;
      } else {
        moreForm.style.display = 'block';
        moreSuccess.style.display = 'none';
      }
    }
  }

  function showPairMoreCardOnly(message) {
    var moreCard = byId('pair-more-card');
    if (!moreCard) return;
    moreCard.style.display = 'block';
    var moreForm = byId('pair-more-form');
    var moreSuccess = byId('pair-more-success');
    if (moreForm) moreForm.style.display = 'none';
    if (moreSuccess) moreSuccess.style.display = 'none';
    var wrap = moreCard.querySelector('.pair-more-error-wrap');
    if (wrap) wrap.remove();
    var errDiv = document.createElement('div');
    errDiv.className = 'pair-more-error-wrap pair-warn';
    errDiv.textContent = message || '同步功能暂时不可用，请稍后重试。';
    var formEl = byId('pair-more-form');
    moreCard.insertBefore(errDiv, formEl || moreCard.firstChild);
  }

  function initPairMore(initFailed) {
    if (!isFirebaseEnabled()) return;
    var moreCard = byId('pair-more-card');
    var moreForm = byId('pair-more-form');
    var moreSuccess = byId('pair-more-success');
    var codeDisplayMore = byId('pair-code-display-more');
    if (!moreCard) return;
    moreCard.style.display = 'block';
    var errWrap = moreCard.querySelector('.pair-more-error-wrap');
    if (errWrap) errWrap.remove();
    if (initFailed) {
      showPairMoreCardOnly('Firebase 初始化失败，请检查网络或稍后重试。');
      return;
    }
    moreForm.style.display = '';
    moreSuccess.style.display = '';
    updatePairUI();

    var createBtnMore = byId('pair-create-btn-more');
    var joinBtnMore = byId('pair-join-btn-more');
    if (createBtnMore && !createBtnMore._pairBound) {
      createBtnMore._pairBound = true;
      createBtnMore.addEventListener('click', function () {
        var code = Math.random().toString(36).slice(2, 8).toLowerCase();
        setRoomId(code);
        ensureCloudDefaults();
        writeInitialRoomDoc().then(function () {
          startCloudListen();
          updatePairUI();
        });
      });
    }
    if (joinBtnMore && !joinBtnMore._pairBound) {
      joinBtnMore._pairBound = true;
      joinBtnMore.addEventListener('click', function () {
        var input = byId('pair-code-input-more');
        var code = (input ? input.value : '').trim().toLowerCase();
        if (!code) return;
        setRoomId(code);
        startCloudListen();
        updatePairUI();
      });
    }
  }

  function bindPairButtons(banner, inner, success, codeDisplay) {
    var createBtn = byId('pair-create-btn');
    var joinBtn = byId('pair-join-btn');
    var closeBtn = byId('pair-close-btn');
    if (createBtn) {
      createBtn.addEventListener('click', function () {
        var code = Math.random().toString(36).slice(2, 8).toLowerCase();
        setRoomId(code);
        ensureCloudDefaults();
        writeInitialRoomDoc().then(function () {
          startCloudListen();
          updatePairUI();
        });
      });
    }
    if (joinBtn) {
      joinBtn.addEventListener('click', function () {
        var code = (byId('pair-code-input').value || '').trim().toLowerCase();
        if (!code) return;
        setRoomId(code);
        startCloudListen();
        updatePairUI();
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        if (banner) banner.style.display = 'none';
        document.body.classList.remove('pair-banner-visible');
      });
    }
  }

  // ----- 工具 -----
  function byId(id) {
    return document.getElementById(id);
  }

  function qs(sel, el) {
    return (el || document).querySelector(sel);
  }

  function qsAll(sel, el) {
    return (el || document).querySelectorAll(sel);
  }

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function getJSON(key, def) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : (def !== undefined ? def : null);
    } catch (e) {
      return def !== undefined ? def : null;
    }
  }

  function setJSON(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      return false;
    }
  }

  // ----- 导航 -----
  function initNav() {
    var pages = qsAll('.page');
    var items = qsAll('.nav-item');
    items.forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        var pageId = item.getAttribute('data-page');
        var targetPage = byId('page-' + pageId);
        if (!targetPage) return;
        items.forEach(function (i) { i.classList.remove('active'); });
        item.classList.add('active');
        pages.forEach(function (p) { p.classList.remove('active'); });
        targetPage.classList.add('active');
      });
    });
  }

  // ----- 倒计时 -----
  function getStartDate() {
    if (isSyncMode()) {
      var raw = cloudData.startDate;
      if (!raw) return null;
      var d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    }
    var raw = localStorage.getItem(STORAGE_KEYS.startDate);
    if (!raw) return null;
    var d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  function setStartDate(dateStr) {
    if (!dateStr) return;
    if (isSyncMode()) {
      cloudData.startDate = dateStr;
      writeCloud('startDate', dateStr);
      return;
    }
    localStorage.setItem(STORAGE_KEYS.startDate, dateStr);
  }

  function renderCountdown() {
    var start = getStartDate();
    var daysEl = byId('days');
    var hoursEl = byId('hours');
    var minutesEl = byId('minutes');
    var secondsEl = byId('seconds');
    var hintEl = byId('start-date-display');
    var inputEl = byId('start-date-input');

    if (start) {
      var pad = function (n) { return n < 10 ? '0' + n : String(n); };
      var update = function () {
        var now = new Date();
        var diff = Math.max(0, (now - start) / 1000);
        var s = Math.floor(diff % 60);
        var m = Math.floor((diff / 60) % 60);
        var h = Math.floor((diff / 3600) % 24);
        var d = Math.floor(diff / 86400);
        if (daysEl) daysEl.textContent = d;
        if (hoursEl) hoursEl.textContent = pad(h);
        if (minutesEl) minutesEl.textContent = pad(m);
        if (secondsEl) secondsEl.textContent = pad(s);
      };
      update();
      setInterval(update, 1000);
      hintEl.innerHTML = '<strong>' + start.getFullYear() + '年' + (start.getMonth() + 1) + '月' + start.getDate() + '日</strong>';
      if (inputEl) {
        inputEl.value = start.getFullYear() + '-' + pad(start.getMonth() + 1) + '-' + pad(start.getDate());
      }
    } else {
      hintEl.textContent = '选择纪念日';
      if (daysEl) daysEl.textContent = '0';
      if (hoursEl) hoursEl.textContent = '00';
      if (minutesEl) minutesEl.textContent = '00';
      if (secondsEl) secondsEl.textContent = '00';
    }
  }

  function initCountdown() {
    byId('save-date-btn').addEventListener('click', function () {
      var val = byId('start-date-input').value;
      if (val) {
        setStartDate(val);
        renderCountdown();
      }
    });
    renderCountdown();
  }

  // ----- 相册 -----
  function getCategories() {
    if (isSyncMode()) return Array.isArray(cloudData.categories) ? cloudData.categories : [];
    var list = getJSON(STORAGE_KEYS.categories, []);
    return Array.isArray(list) ? list : [];
  }

  function saveCategories(list) {
    if (isSyncMode()) {
      cloudData.categories = list;
      writeCloud('categories', list);
      return;
    }
    setJSON(STORAGE_KEYS.categories, list);
  }

  function getPhotos() {
    if (isSyncMode()) {
      var list = Array.isArray(cloudData.photos) ? cloudData.photos : [];
      return list.map(function (p) {
        return { id: p.id, data: p.data, category: p.category || '', caption: p.caption || '', createdAt: p.createdAt || 0 };
      });
    }
    var list = getJSON(STORAGE_KEYS.photos, []);
    return Array.isArray(list) ? list : [];
  }

  function savePhotos(list) {
    if (isSyncMode()) {
      return;
    }
    setJSON(STORAGE_KEYS.photos, list);
  }

  function resizeImageToDataUrl(file, maxSize, quality, cb) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(url);
      var w = img.width;
      var h = img.height;
      if (w > maxSize || h > maxSize) {
        if (w > h) {
          h = (h * maxSize) / w;
          w = maxSize;
        } else {
          w = (w * maxSize) / h;
          h = maxSize;
        }
      }
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      cb(null);
    };
    img.src = url;
  }

  function doAddPhotoToCloud(photosRef, photoId, payload) {
    photosRef.doc(photoId).set(payload).then(function () {
      renderAlbum();
      syncCategorySelect();
    }).catch(function (err) {
      console.error('Firestore photo write error', err);
      var msg = (err && err.message) ? err.message : String(err);
      if (msg.indexOf('resource-exhausted') !== -1 || msg.indexOf('payload') !== -1 || msg.indexOf('too large') !== -1) {
        alert('照片体积过大，请选择更小或更简单的图片重试。');
      } else if (msg.indexOf('permission') !== -1 || msg.indexOf('Permission') !== -1) {
        alert('没有写入权限，请到 Firebase 控制台发布 Firestore 规则。');
      } else {
        alert('照片上传失败：' + msg);
      }
    });
  }

  function addPhoto(dataUrl, category, caption) {
    var photoId = genId();
    if (isSyncMode()) {
      var photosRef = cloudPhotosRef();
      if (!photosRef) {
        console.warn('cloudPhotosRef is null');
        alert('同步未就绪，请刷新页面后重试。');
        return;
      }
      doAddPhotoToCloud(photosRef, photoId, {
        data: dataUrl,
        category: category || '',
        caption: caption || '',
        createdAt: Date.now()
      });
      return;
    }
    var photos = getPhotos();
    photos.push({
      id: photoId,
      data: dataUrl,
      category: category || '',
      caption: caption || '',
      createdAt: Date.now()
    });
    savePhotos(photos);
  }

  function deletePhoto(id) {
    if (isSyncMode()) {
      var photosRef = cloudPhotosRef();
      if (photosRef) photosRef.doc(id).delete().catch(function (err) {
        console.error('Firestore photo delete error', err);
        alert('删除失败：' + ((err && err.message) ? err.message : String(err)));
      });
      return;
    }
    var photos = getPhotos().filter(function (p) { return p.id !== id; });
    savePhotos(photos);
  }

  function syncCategorySelect() {
    var categories = getCategories();
    var sel = byId('album-category');
    if (!sel) return;
    var current = sel.value;
    sel.innerHTML = '<option value="">全部分类</option>';
    categories.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });
    sel.value = current || '';
  }

  function renderAlbum() {
    var photos = getPhotos();
    var categoryFilter = (byId('album-category') || {}).value || '';
    var search = ((byId('album-search') || {}).value || '').trim().toLowerCase();
    var filtered = photos.filter(function (p) {
      var catOk = !categoryFilter || p.category === categoryFilter;
      var searchOk = !search || (p.caption || '').toLowerCase().indexOf(search) >= 0 || (p.category || '').toLowerCase().indexOf(search) >= 0;
      return catOk && searchOk;
    });

    var grid = byId('album-grid');
    var empty = byId('album-empty');
    if (!grid) return;

    grid.innerHTML = '';
    filtered.forEach(function (p) {
      var div = document.createElement('div');
      div.className = 'album-item';
      div.setAttribute('data-id', p.id);
      var img = document.createElement('img');
      img.src = p.data;
      img.alt = p.caption || '照片';
      var tag = document.createElement('span');
      tag.className = 'album-category-tag';
      tag.textContent = p.category || '未分类';
      div.appendChild(img);
      div.appendChild(tag);
      div.addEventListener('click', function () { openPhotoModal(p); });
      grid.appendChild(div);
    });

    if (empty) {
      empty.classList.toggle('visible', photos.length === 0);
    }
  }

  function openPhotoModal(photo) {
    var modal = byId('photo-modal');
    var imgEl = byId('photo-modal-img');
    var captionEl = byId('photo-modal-caption');
    if (modal && imgEl) {
      imgEl.src = photo.data;
      imgEl.alt = photo.caption || '';
      if (captionEl) captionEl.value = photo.caption || '';
      modal.setAttribute('data-current-id', photo.id);
      modal.classList.add('active');
    }
  }

  function closePhotoModal() {
    var modal = byId('photo-modal');
    if (modal) modal.classList.remove('active');
  }

  function initAlbum() {
    syncCategorySelect();
    renderAlbum();

    byId('photo-upload').addEventListener('change', function (e) {
      var files = e.target.files;
      if (!files || !files.length) return;
      var category = (byId('album-category') || {}).value || '';
      var remaining = files.length;
      var maxSize = isSyncMode() ? SYNC_PHOTO_SIZE : MAX_PHOTO_SIZE;
      var quality = isSyncMode() ? SYNC_PHOTO_QUALITY : PHOTO_QUALITY;
      function done() {
        remaining--;
        if (remaining <= 0) {
          e.target.value = '';
          renderAlbum();
          syncCategorySelect();
        }
      }
      for (var i = 0; i < files.length; i++) {
        (function (file) {
          if (!file.type || file.type.indexOf('image') !== 0) {
            done();
            return;
          }
          resizeImageToDataUrl(file, maxSize, quality, function (dataUrl) {
            if (dataUrl) addPhoto(dataUrl, category, '');
            done();
          });
        })(files[i]);
      }
    });

    byId('album-category').addEventListener('change', renderAlbum);
    byId('album-search').addEventListener('input', renderAlbum);

    byId('add-category-btn').addEventListener('click', function () {
      var input = byId('new-category-input');
      var name = (input.value || '').trim();
      if (!name) return;
      var cats = getCategories();
      if (cats.indexOf(name) >= 0) return;
      cats.push(name);
      saveCategories(cats);
      input.value = '';
      syncCategorySelect();
    });

    byId('photo-modal').addEventListener('click', function (e) {
      if (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('modal-close')) {
        closePhotoModal();
      }
    });

    byId('photo-delete-btn').addEventListener('click', function () {
      var id = byId('photo-modal').getAttribute('data-current-id');
      if (id) {
        deletePhoto(id);
        closePhotoModal();
        renderAlbum();
      }
    });

    byId('photo-save-caption-btn').addEventListener('click', function () {
      var id = byId('photo-modal').getAttribute('data-current-id');
      var caption = (byId('photo-modal-caption').value || '').trim();
      if (!id) return;
      if (isSyncMode()) {
        var photosRef = cloudPhotosRef();
        if (photosRef) {
          photosRef.doc(id).update({ caption: caption }).then(function () {
            closePhotoModal();
          }).catch(function (err) {
            console.error('Firestore caption update error', err);
            alert('保存说明失败：' + ((err && err.message) ? err.message : String(err)));
          });
        } else {
          closePhotoModal();
        }
        return;
      }
      var photos = getPhotos();
      var photo = photos.find(function (p) { return p.id === id; });
      if (photo) {
        photo.caption = caption;
        savePhotos(photos);
        renderAlbum();
      }
    });
  }

  // ----- 目标 -----
  function getGoals() {
    if (isSyncMode()) return Array.isArray(cloudData.goals) ? cloudData.goals : [];
    var list = getJSON(STORAGE_KEYS.goals, []);
    return Array.isArray(list) ? list : [];
  }

  function saveGoals(list) {
    if (isSyncMode()) {
      cloudData.goals = list;
      writeCloud('goals', list);
      return;
    }
    setJSON(STORAGE_KEYS.goals, list);
  }

  function renderGoals(filter) {
    var goals = getGoals();
    filter = filter || 'all';
    var filtered = goals.filter(function (g) {
      if (filter === 'done') return g.done;
      if (filter === 'pending') return !g.done;
      return true;
    });

    var listEl = byId('goal-list');
    var emptyEl = byId('goals-empty');
    if (!listEl) return;

    listEl.innerHTML = '';
    filtered.forEach(function (g) {
      var li = document.createElement('li');
      li.className = 'goal-item' + (g.done ? ' done' : '');
      li.setAttribute('data-id', g.id);
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'goal-checkbox';
      checkbox.checked = !!g.done;
      checkbox.addEventListener('change', function () {
        var list = getGoals();
        var goal = list.find(function (x) { return x.id === g.id; });
        if (goal) {
          goal.done = checkbox.checked;
          saveGoals(list);
          renderGoals(filter);
        }
      });
      var text = document.createElement('span');
      text.className = 'goal-text';
      text.textContent = g.text || '';
      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'goal-edit-btn';
      editBtn.textContent = '✎';
      editBtn.addEventListener('click', function () { openGoalEdit(g); });
      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'goal-del-btn';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', function () {
        saveGoals(getGoals().filter(function (x) { return x.id !== g.id; }));
        renderGoals(filter);
      });
      var actions = document.createElement('div');
      actions.className = 'goal-actions';
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      li.appendChild(checkbox);
      li.appendChild(text);
      li.appendChild(actions);
      listEl.appendChild(li);
    });

    if (emptyEl) emptyEl.classList.toggle('visible', goals.length === 0);
  }

  function openGoalEdit(goal) {
    byId('goal-edit-id').value = goal.id;
    byId('goal-edit-input').value = goal.text || '';
    byId('goal-edit-modal').classList.add('active');
  }

  function closeGoalEditModal() {
    byId('goal-edit-modal').classList.remove('active');
  }

  function initGoals() {
    var filter = 'all';
    qsAll('.filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        qsAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        filter = btn.getAttribute('data-filter') || 'all';
        currentGoalFilter = filter;
        renderGoals(filter);
      });
    });

    byId('goal-add-btn').addEventListener('click', function () {
      var input = byId('goal-input');
      var text = (input.value || '').trim();
      if (!text) return;
      var list = getGoals();
      list.push({ id: genId(), text: text, done: false, createdAt: Date.now() });
      saveGoals(list);
      input.value = '';
      renderGoals(filter);
    });

    byId('goal-edit-modal').addEventListener('click', function (e) {
      if (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('modal-close')) {
        closeGoalEditModal();
      }
    });

    byId('goal-save-edit-btn').addEventListener('click', function () {
      var id = byId('goal-edit-id').value;
      var text = (byId('goal-edit-input').value || '').trim();
      if (!id || !text) return;
      var list = getGoals();
      var goal = list.find(function (x) { return x.id === id; });
      if (goal) {
        goal.text = text;
        saveGoals(list);
        renderGoals(filter);
      }
      closeGoalEditModal();
    });

    renderGoals(filter);
  }

  // ----- 留言 -----
  function getMessages() {
    if (isSyncMode()) return Array.isArray(cloudData.messages) ? cloudData.messages : [];
    var list = getJSON(STORAGE_KEYS.messages, []);
    return Array.isArray(list) ? list : [];
  }

  function saveMessages(list) {
    if (isSyncMode()) {
      cloudData.messages = list;
      writeCloud('messages', list);
      return;
    }
    setJSON(STORAGE_KEYS.messages, list);
  }

  function renderMessages() {
    var messages = getMessages();
    var board = byId('message-board');
    var empty = byId('messages-empty');
    if (!board) return;

    board.innerHTML = '';
    messages.forEach(function (m) {
      var div = document.createElement('div');
      div.className = 'message-note';
      div.setAttribute('data-id', m.id);
      var text = document.createElement('div');
      text.className = 'note-text';
      text.textContent = m.text || '';
      var time = document.createElement('div');
      time.className = 'note-time';
      time.textContent = m.createdAt ? new Date(m.createdAt).toLocaleString('zh-CN') : '';
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'note-del';
      del.textContent = '×';
      del.addEventListener('click', function () {
        saveMessages(getMessages().filter(function (x) { return x.id !== m.id; }));
        renderMessages();
      });
      div.appendChild(del);
      div.appendChild(text);
      div.appendChild(time);
      board.appendChild(div);
    });

    if (empty) empty.classList.toggle('visible', messages.length === 0);
  }

  function initMessages() {
    byId('message-add-btn').addEventListener('click', function () {
      var input = byId('message-input');
      var text = (input.value || '').trim();
      if (!text) return;
      var list = getMessages();
      list.push({ id: genId(), text: text, createdAt: Date.now() });
      saveMessages(list);
      input.value = '';
      renderMessages();
    });
    renderMessages();
  }

  // ----- 关于我们 -----
  function getAbout() {
    if (isSyncMode()) return cloudData.about && typeof cloudData.about === 'object' ? cloudData.about : { story: '', name1: '', name2: '' };
    return getJSON(STORAGE_KEYS.about, { story: '', name1: '', name2: '' }) || {};
  }

  function saveAbout(data) {
    if (isSyncMode()) {
      cloudData.about = data;
      writeCloud('about', data);
      return;
    }
    setJSON(STORAGE_KEYS.about, data);
  }

  function initAbout() {
    var about = getAbout();
    var storyEl = byId('about-story');
    var name1El = byId('about-name1');
    var name2El = byId('about-name2');
    if (storyEl) storyEl.value = about.story || '';
    if (name1El) name1El.value = about.name1 || '';
    if (name2El) name2El.value = about.name2 || '';

    byId('save-about-btn').addEventListener('click', function () {
      var about = getAbout();
      about.story = (storyEl && storyEl.value) || '';
      saveAbout(about);
      showSavedTip(byId('save-about-btn'));
    });

    byId('save-names-btn').addEventListener('click', function () {
      var about = getAbout();
      about.name1 = (name1El && name1El.value) || '';
      about.name2 = (name2El && name2El.value) || '';
      saveAbout(about);
      showSavedTip(byId('save-names-btn'));
    });
  }

  function showSavedTip(btn) {
    if (!btn) return;
    var text = btn.textContent;
    btn.textContent = '已保存 ✓';
    btn.disabled = true;
    setTimeout(function () {
      btn.textContent = text;
      btn.disabled = false;
    }, 1200);
  }

  // ----- 共享位置 -----
  function getLocations() {
    if (isSyncMode()) return Array.isArray(cloudData.locations) ? cloudData.locations : [];
    var list = getJSON(STORAGE_KEYS.locations, []);
    return Array.isArray(list) ? list : [];
  }

  function saveLocations(list) {
    if (isSyncMode()) {
      cloudData.locations = list;
      writeCloud('locations', list);
      return;
    }
    setJSON(STORAGE_KEYS.locations, list);
  }

  function renderLocations() {
    var list = getLocations();
    var el = byId('location-list');
    var empty = byId('location-empty');
    if (!el) return;
    el.innerHTML = '';
    list.forEach(function (loc) {
      var li = document.createElement('li');
      li.className = 'location-item';
      var name = document.createElement('span');
      name.className = 'location-name';
      name.textContent = loc.name || '未命名';
      var note = loc.note ? document.createElement('span') : null;
      if (note) {
        note.className = 'location-note';
        note.textContent = loc.note;
      }
      var openMap = document.createElement('button');
      openMap.type = 'button';
      openMap.className = 'btn-cute small';
      openMap.textContent = '地图';
      openMap.addEventListener('click', function () {
        if (loc.lat != null && loc.lng != null) {
          window.open('https://www.google.com/maps?q=' + loc.lat + ',' + loc.lng, '_blank');
        }
      });
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'location-del';
      del.textContent = '×';
      del.addEventListener('click', function () {
        saveLocations(getLocations().filter(function (x) { return x.id !== loc.id; }));
        renderLocations();
      });
      li.appendChild(name);
      if (note) li.appendChild(note);
      li.appendChild(openMap);
      li.appendChild(del);
      el.appendChild(li);
    });
    if (empty) empty.classList.toggle('visible', list.length === 0);
  }

  function initLocations() {
    renderLocations();
    byId('location-add-btn').addEventListener('click', function () {
      var name = (byId('location-name').value || '').trim();
      var note = (byId('location-note').value || '').trim();
      var latStr = (byId('location-lat').value || '').trim();
      var lngStr = (byId('location-lng').value || '').trim();
      if (!name) return;
      var lat = latStr ? parseFloat(latStr) : null;
      var lng = lngStr ? parseFloat(lngStr) : null;
      if (isNaN(lat)) lat = null;
      if (isNaN(lng)) lng = null;
      var list = getLocations();
      list.push({ id: genId(), name: name, note: note || '', lat: lat, lng: lng, createdAt: Date.now() });
      saveLocations(list);
      byId('location-name').value = '';
      byId('location-note').value = '';
      byId('location-lat').value = '';
      byId('location-lng').value = '';
      renderLocations();
    });
    byId('location-get-here').addEventListener('click', function () {
      if (!navigator.geolocation) {
        alert('当前浏览器不支持获取位置');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          byId('location-lat').value = pos.coords.latitude.toFixed(6);
          byId('location-lng').value = pos.coords.longitude.toFixed(6);
        },
        function () { alert('无法获取位置，请检查权限或稍后重试'); }
      );
    });
  }

  // ----- 消息提醒 -----
  function getReminderSettings() {
    if (isSyncMode()) return cloudData.reminderSettings && typeof cloudData.reminderSettings === 'object' ? cloudData.reminderSettings : { advanceDays: 0, dailyTime: '20:00', dailyOn: false, lastNotifiedDate: null };
    return getJSON(STORAGE_KEYS.reminderSettings, {
      advanceDays: 0,
      dailyTime: '20:00',
      dailyOn: false,
      lastNotifiedDate: null
    }) || {};
  }

  function saveReminderSettings(s) {
    if (isSyncMode()) {
      cloudData.reminderSettings = s;
      writeCloud('reminderSettings', s);
      return;
    }
    setJSON(STORAGE_KEYS.reminderSettings, s);
  }

  function requestNotificationPermission(cb) {
    if (!('Notification' in window)) {
          if (cb) cb(false);
          return;
        }
    if (Notification.permission === 'granted') {
      if (cb) cb(true);
      return;
    }
    if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(function (p) {
        if (cb) cb(p === 'granted');
      });
    } else if (cb) cb(false);
  }

  function showNotification(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body: body, icon: '/favicon.ico' });
    } catch (e) {}
  }

  function checkReminders() {
    var s = getReminderSettings();
    var start = getStartDate();
    if (!start) return;
    var now = new Date();
    var today = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
    var startMonth = start.getMonth();
    var startDate = start.getDate();
    var advance = parseInt(s.advanceDays, 10) || 0;
    var lastNotified = s.lastNotifiedDate || '';

    for (var d = 0; d <= advance; d++) {
      var t = new Date(now);
      t.setDate(t.getDate() + d);
      var tm = t.getMonth();
      var td = t.getDate();
      if (tm === startMonth && td === startDate) {
        var key = t.getFullYear() + '-' + (tm + 1) + '-' + td;
        if (lastNotified !== key) {
          showNotification('纪念日提醒', d === 0 ? '今天是我们在一起的纪念日哦～' : '还有 ' + d + ' 天就是纪念日啦！');
          s.lastNotifiedDate = key;
          saveReminderSettings(s);
        }
        return;
      }
    }

    if (s.dailyOn && s.dailyTime) {
      var parts = s.dailyTime.split(':');
      var h = parseInt(parts[0], 10) || 20;
      var m = parseInt(parts[1], 10) || 0;
      if (now.getHours() === h && now.getMinutes() === m && lastNotified !== today) {
        showNotification('每日提醒', '来看看我们的纪念站吧～');
        s.lastNotifiedDate = today;
        saveReminderSettings(s);
      }
    }
  }

  function initReminders() {
    var s = getReminderSettings();
    var advanceEl = byId('reminder-advance');
    var timeEl = byId('reminder-daily-time');
    var dailyOnEl = byId('reminder-daily-on');
    if (advanceEl) advanceEl.value = String(s.advanceDays !== undefined ? s.advanceDays : 0);
    if (timeEl) timeEl.value = s.dailyTime || '20:00';
    if (dailyOnEl) dailyOnEl.checked = !!s.dailyOn;

    byId('reminder-request-btn').addEventListener('click', function () {
      requestNotificationPermission(function (ok) {
        alert(ok ? '已开启通知' : '请手动允许通知权限');
      });
    });

    byId('reminder-save-btn').addEventListener('click', function () {
      var s = getReminderSettings();
      s.advanceDays = parseInt((byId('reminder-advance') || {}).value, 10) || 0;
      s.dailyTime = (byId('reminder-daily-time') || {}).value || '20:00';
      s.dailyOn = !!(byId('reminder-daily-on') && byId('reminder-daily-on').checked);
      saveReminderSettings(s);
      showSavedTip(byId('reminder-save-btn'));
    });

    setInterval(checkReminders, 60000);
    checkReminders();
  }

  // ----- 入口 -----
  function init() {
    initPairBanner();
    initNav();
    initCountdown();
    initAlbum();
    initGoals();
    initMessages();
    initAbout();
    initLocations();
    initReminders();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
