(function () {
  'use strict';

  /* ---------- 탭: 클릭하면 해당 섹션으로 스크롤 + 스크롤 위치에 따라 활성 탭 표시 ---------- */
  var tabBar = document.querySelector('.tabs');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var sections = tabs.map(function (t) { return document.getElementById(t.dataset.target); });

  function setActive(id) {
    tabs.forEach(function (t) {
      var on = t.dataset.target === id;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  var lockSpy = false, lockTimer;
  function goTo(id) {
    var sec = document.getElementById(id);
    if (!sec) return;
    var y = sec.getBoundingClientRect().top + window.pageYOffset - tabBar.offsetHeight + 1;
    setActive(id);
    lockSpy = true;
    clearTimeout(lockTimer);
    lockTimer = setTimeout(function () { lockSpy = false; }, 900);
    window.scrollTo({ top: y, behavior: 'smooth' });
    history.replaceState(null, '', '#' + id);
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { goTo(t.dataset.target); });
  });
  document.querySelectorAll('[data-goto]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); goTo(el.dataset.goto); });
  });

  function spy() {
    if (lockSpy) return;
    var line = tabBar.offsetHeight + 40;
    var current = sections[0].id;
    sections.forEach(function (s) {
      if (s.getBoundingClientRect().top <= line) current = s.id;
    });
    if ((window.innerHeight + window.pageYOffset) >= document.body.scrollHeight - 4) {
      current = sections[sections.length - 1].id;
    }
    setActive(current);
  }

  /* ---------- TOP 버튼 ---------- */
  var topBtn = document.querySelector('.totop');
  topBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      spy();
      topBtn.classList.toggle('is-show', window.pageYOffset > 500);
      ticking = false;
    });
  }, { passive: true });
  spy();

  /* ---------- 스와이퍼 ---------- */
  document.querySelectorAll('[data-swiper]').forEach(function (root) {
    var track = root.querySelector('.swiper__track');
    var slides = track.children;
    var total = slides.length;
    var prev = root.querySelector('.sw-prev');
    var next = root.querySelector('.sw-next');
    var count = root.querySelector('.gallery__count');
    var dotsWrap = root.querySelector('.dots');
    var bar = root.querySelector('.progress span');
    var dots = [];

    if (dotsWrap) {
      for (var i = 0; i < total; i++) {
        var d = document.createElement('button');
        d.className = 'dot';
        d.setAttribute('aria-label', (i + 1) + '번째 사진');
        (function (n) { d.addEventListener('click', function () { go(n); }); })(i);
        dotsWrap.appendChild(d);
        dots.push(d);
      }
    }

    function step() {
      return slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth;
    }
    function index() {
      return Math.min(total - 1, Math.max(0, Math.round(track.scrollLeft / step())));
    }
    function maxScroll() { return track.scrollWidth - track.clientWidth; }
    function go(n) {
      n = Math.max(0, Math.min(total - 1, n));
      track.scrollTo({ left: Math.min(slides[n].offsetLeft - slides[0].offsetLeft, maxScroll()), behavior: 'smooth' });
    }
    function update() {
      var atEnd = track.scrollLeft >= maxScroll() - 2;
      var i = atEnd ? total - 1 : index();
      count.textContent = (i + 1) + ' / ' + total;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = atEnd;
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === i); });
      if (bar) bar.style.width = ((i + 1) / total * 100) + '%';
    }

    /* 프로그래스바: 클릭하거나 끌면 그 위치 사진으로 이동 */
    var prog = root.querySelector('.progress');
    if (prog) {
      var seeking = false;
      var seek = function (clientX, smooth) {
        var r = prog.getBoundingClientRect();
        var ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
        var n = Math.min(total - 1, Math.floor(ratio * total));
        if (bar) bar.style.width = ((n + 1) / total * 100) + '%';
        var left = Math.min(slides[n].offsetLeft - slides[0].offsetLeft, maxScroll());
        if (smooth) track.scrollTo({ left: left, behavior: 'smooth' });
        else { track.style.scrollBehavior = 'auto'; track.style.scrollSnapType = 'none'; track.scrollLeft = left; }
      };
      prog.addEventListener('pointerdown', function (e) {
        seeking = true; prog.classList.add('is-drag');
        try { prog.setPointerCapture(e.pointerId); } catch (err) {}
        seek(e.clientX, false);
        e.preventDefault();
      });
      prog.addEventListener('pointermove', function (e) { if (seeking) seek(e.clientX, false); });
      var endSeek = function () {
        if (!seeking) return;
        seeking = false; prog.classList.remove('is-drag');
        track.style.scrollBehavior = ''; track.style.scrollSnapType = '';
      };
      prog.addEventListener('pointerup', endSeek);
      prog.addEventListener('pointercancel', endSeek);
    }

    prev.addEventListener('click', function () { go(index() - 1); });
    next.addEventListener('click', function () { go(index() + 1); });
    track.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);

    /* 마우스 드래그 (터치는 기본 스크롤로 동작) */
    var down = false, startX = 0, startLeft = 0, moved = false;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; track.classList.add('is-drag'); }
      track.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      if (moved) {
        track.classList.remove('is-drag');
        go(index());
      }
    });
    track.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; return; }
      var slide = e.target.closest('.swiper__slide');
      if (slide) openLB(track, Array.prototype.indexOf.call(slides, slide));
    }, true);

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') go(index() - 1);
      if (e.key === 'ArrowRight') go(index() + 1);
    });

    update();
  });

  /* ---------- 라이트박스 (사진 크게 보기) ---------- */
  var lb = document.querySelector('.lb');
  var lbImg = lb.querySelector('img');
  var lbCnt = lb.querySelector('.lb__cnt');
  var lbList = [], lbIdx = 0;

  function showLB() {
    lbImg.src = lbList[lbIdx].src;
    lbImg.alt = lbList[lbIdx].alt;
    lbCnt.textContent = (lbIdx + 1) + ' / ' + lbList.length;
  }
  function openLB(track, i) {
    lbList = Array.prototype.slice.call(track.querySelectorAll('img'));
    lbIdx = i;
    showLB();
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeLB() {
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  function moveLB(d) { lbIdx = (lbIdx + d + lbList.length) % lbList.length; showLB(); }

  lb.querySelector('.lb__close').addEventListener('click', closeLB);
  lb.querySelector('.lb__prev').addEventListener('click', function () { moveLB(-1); });
  lb.querySelector('.lb__next').addEventListener('click', function () { moveLB(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLB(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLB();
    if (e.key === 'ArrowLeft') moveLB(-1);
    if (e.key === 'ArrowRight') moveLB(1);
  });
  var tx = 0;
  lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) moveLB(dx < 0 ? 1 : -1);
  });
})();
