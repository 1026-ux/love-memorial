(function () {
  'use strict';

  var STORAGE_KEYS = {
    startDate: 'love_memorial_start_date',
    photos: 'love_memorial_photos',
    categories: 'love_memorial_categories',
    goals: 'love_memorial_goals',
    messages: 'love_memorial_messages',
    about: 'love_memorial_about'
  };

  var MAX_PHOTO_SIZE = 600;
  var PHOTO_QUALITY = 0.75;

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
    var raw = localStorage.getItem(STORAGE_KEYS.startDate);
    if (!raw) return null;
    var d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  function setStartDate(dateStr) {
    if (!dateStr) return;
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
    var list = getJSON(STORAGE_KEYS.categories, []);
    return Array.isArray(list) ? list : [];
  }

  function saveCategories(list) {
    setJSON(STORAGE_KEYS.categories, list);
  }

  function getPhotos() {
    var list = getJSON(STORAGE_KEYS.photos, []);
    return Array.isArray(list) ? list : [];
  }

  function savePhotos(list) {
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

  function addPhoto(dataUrl, category, caption) {
    var photos = getPhotos();
    photos.push({
      id: genId(),
      data: dataUrl,
      category: category || '',
      caption: caption || '',
      createdAt: Date.now()
    });
    savePhotos(photos);
  }

  function deletePhoto(id) {
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
          resizeImageToDataUrl(file, MAX_PHOTO_SIZE, PHOTO_QUALITY, function (dataUrl) {
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
    var list = getJSON(STORAGE_KEYS.goals, []);
    return Array.isArray(list) ? list : [];
  }

  function saveGoals(list) {
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
    var list = getJSON(STORAGE_KEYS.messages, []);
    return Array.isArray(list) ? list : [];
  }

  function saveMessages(list) {
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
    return getJSON(STORAGE_KEYS.about, { story: '', name1: '', name2: '' }) || {};
  }

  function saveAbout(data) {
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

  // ----- 入口 -----
  function init() {
    initNav();
    initCountdown();
    initAlbum();
    initGoals();
    initMessages();
    initAbout();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
