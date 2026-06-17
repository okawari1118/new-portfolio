/* =========================================
   Sakura Miya — Portfolio interactions
   ========================================= */

(() => {
  'use strict';

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const isTouch = matchMedia('(hover: none)').matches;
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
   * 1. Smooth (inertia) scroll  — desktop only
   *    モバイルは iOS 標準の慣性が最も自然なのでネイティブに任せる
   * ========================================================= */
  let scrollY = window.scrollY;
  let smoothY = scrollY;

  function rafScroll() {
    smoothY = lerp(smoothY, scrollY, 0.10);
    if (Math.abs(smoothY - scrollY) < 0.05) smoothY = scrollY;
    document.dispatchEvent(new CustomEvent('smoothscroll', { detail: { y: smoothY } }));
    requestAnimationFrame(rafScroll);
  }

  window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });
  requestAnimationFrame(rafScroll);

  /* =========================================================
   * 2. Loader : Blur-to-Focus + progress
   * ========================================================= */
  const loader   = document.getElementById('loader');
  const fill     = document.getElementById('loaderFill');
  const percent  = document.getElementById('loaderPercent');

  let progress = 0;
  const minDuration = 1400; // ms — 演出のために最低でもこのぐらいは見せる
  const startedAt   = performance.now();

  function tickLoader() {
    const elapsed = performance.now() - startedAt;
    // ease-out 風に 0→100% へ
    const t = clamp(elapsed / minDuration, 0, 1);
    progress = Math.round((1 - Math.pow(1 - t, 2)) * 100);
    fill.style.inset = `0 ${100 - progress}% 0 0`;
    percent.textContent = String(progress).padStart(3, '0');

    if (progress < 100) {
      requestAnimationFrame(tickLoader);
    } else {
      finishLoader();
    }
  }

  function finishLoader() {
    document.body.classList.add('is-loaded');
    document.body.classList.remove('is-loading');
    setTimeout(() => {
      loader.classList.add('gone');
      // MV のタイトルアニメをトリガするためにスクロールイベントを発火
      window.dispatchEvent(new Event('scroll'));
    }, 1000);
  }

  // フォント読み込みなど待つ
  if (document.readyState === 'complete') {
    requestAnimationFrame(tickLoader);
  } else {
    window.addEventListener('load', () => requestAnimationFrame(tickLoader));
  }

  /* =========================================================
   * 3. IntersectionObserver — reveal animations
   * ========================================================= */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        // 一度きり
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('.reveal-lines, .reveal, .gallery-item').forEach(el => io.observe(el));

  /* =========================================================
   * 4. Main Movie — slide-up + fade on scroll
   * ========================================================= */
  const mvSection = document.getElementById('main-movie');
  const mvMedia   = document.getElementById('mvMedia');
  const mvContent = document.getElementById('mvContent');

  function updateMV(y) {
    if (!mvSection) return;
    const h = mvSection.offsetHeight;
    const t = clamp(y / h, 0, 1);

    // 動画は少しずつ上へスライド + フェード
    const translateMedia  = -t * 80;        // px
    const translateContent = -t * 140;
    const opacity = 1 - t * 1.1;

    mvMedia.style.transform   = `translate3d(0, ${translateMedia}px, 0) scale(${1 + t * 0.04})`;
    mvContent.style.transform = `translate3d(0, ${translateContent}px, 0)`;
    mvMedia.style.opacity     = clamp(opacity, 0, 1);
    mvContent.style.opacity   = clamp(opacity + 0.1, 0, 1);
  }

  document.addEventListener('smoothscroll', (e) => updateMV(e.detail.y));

  /* =========================================================
   * 5. Gallery — column parallax
   *    左右のカラムでわずかに速度を変えて立体感
   * ========================================================= */
  const galleryItems = document.querySelectorAll('.gallery-item');
  const galleryGrid  = document.getElementById('galleryGrid');

  function updateGallery(y) {
    if (!galleryGrid) return;
    const rect = galleryGrid.getBoundingClientRect();
    const vh   = window.innerHeight;
    if (rect.bottom < 0 || rect.top > vh) return;

    // -1 (画面下) から +1 (画面上) の進行度
    const progress = (vh - rect.top) / (vh + rect.height);
    const offset   = (progress - 0.5) * 80; // -40 〜 +40 px

    galleryItems.forEach(item => {
      const isLeft = item.classList.contains('col-l');
      const factor = isLeft ? 0.45 : -0.55;
      const translate = offset * factor;
      item.style.setProperty('--parallax', `${translate}px`);
    });
  }

  document.addEventListener('smoothscroll', (e) => updateGallery(e.detail.y));

  /* =========================================================
   * 6. Lightbox — Shared Element Transition + Swipe-to-close
   * ========================================================= */
  const lightbox  = document.getElementById('lightbox');
  const lbStage   = document.getElementById('lbStage');
  const lbImg     = document.getElementById('lbImg');
  const lbClose   = document.getElementById('lbClose');
  const lbCaption = document.getElementById('lbCaption');
  const lbBackdrop= document.getElementById('lbBackdrop');

  let activeThumb = null;
  let isOpen      = false;

  function getTargetRect() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // 画像のアスペクト比に応じて 90vmin に内接
    const imgRatio = lbImg.naturalWidth / lbImg.naturalHeight || 0.8;
    const maxW = vw * 0.92;
    const maxH = vh * 0.86;
    let w = maxW, h = w / imgRatio;
    if (h > maxH) { h = maxH; w = h * imgRatio; }
    return {
      top:  (vh - h) / 2,
      left: (vw - w) / 2,
      width: w, height: h
    };
  }

  function setStageRect(rect) {
    lbStage.style.top    = rect.top    + 'px';
    lbStage.style.left   = rect.left   + 'px';
    lbStage.style.width  = rect.width  + 'px';
    lbStage.style.height = rect.height + 'px';
  }

  function openLightbox(thumb) {
    if (isOpen) return;
    activeThumb = thumb;
    const innerImg = thumb.querySelector('img');
    const rect = innerImg.getBoundingClientRect();

    // 0. 画像を差し替え
    lbImg.src = innerImg.currentSrc || innerImg.src;

    // キャプション
    const num = thumb.querySelector('.gi-num')?.textContent || '';
    const cat = thumb.querySelector('.gi-cat')?.textContent || '';
    lbCaption.querySelector('.lb-num').textContent = num;
    lbCaption.querySelector('.lb-cat').textContent = cat;

    // 1. 開始位置（サムネと同じ場所）にステージを置く
    lbStage.style.transition = 'none';
    setStageRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    // サムネを一時的に隠す（消えた感を出す）
    innerImg.style.opacity = '0';

    // 2. 次のフレームでフルスクリーン位置へアニメ
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        lbStage.style.transition = '';
        setStageRect(getTargetRect());
      });
    });

    isOpen = true;
  }

  function closeLightbox() {
    if (!isOpen || !activeThumb) return;
    const innerImg = activeThumb.querySelector('img');
    const rect = innerImg.getBoundingClientRect();

    lightbox.classList.add('is-closing');
    lightbox.classList.remove('is-dragging');

    // 元の場所へ縮小
    lbStage.style.transition = '';
    lbStage.style.transform  = '';
    setStageRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });

    setTimeout(() => {
      lightbox.classList.remove('is-open', 'is-closing');
      lbStage.style.transition = 'none';
      lbStage.style.transform  = '';
      lbImg.src = '';
      innerImg.style.opacity = '';
      document.body.style.overflow = '';
      isOpen = false;
      activeThumb = null;
    }, 600);
  }

  galleryItems.forEach(item => {
    item.addEventListener('click', () => openLightbox(item));
  });
  lbClose.addEventListener('click', closeLightbox);
  lbBackdrop.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  /* ----- Swipe-to-close (drag down) ----- */
  let dragStartY = 0;
  let dragDelta  = 0;
  let dragging   = false;

  const onPointerDown = (e) => {
    if (!isOpen) return;
    // クローズボタン上では発動しない
    if (e.target.closest('.lb-close')) return;
    dragging = true;
    dragStartY = (e.touches ? e.touches[0].clientY : e.clientY);
    dragDelta = 0;
    lightbox.classList.add('is-dragging');
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    const y = (e.touches ? e.touches[0].clientY : e.clientY);
    dragDelta = y - dragStartY;
    if (dragDelta < 0) dragDelta = dragDelta * 0.3; // 上方向は重く
    const scale  = clamp(1 - Math.abs(dragDelta) / 1200, 0.7, 1);
    const opa    = clamp(1 - Math.abs(dragDelta) / 600, 0.2, 1);
    lbStage.style.transform   = `translate3d(0, ${dragDelta}px, 0) scale(${scale})`;
    lbBackdrop.style.opacity  = String(opa);
  };

  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    lightbox.classList.remove('is-dragging');

    if (Math.abs(dragDelta) > 120) {
      // しきい値を超えたら閉じる
      closeLightbox();
    } else {
      // 元に戻す
      lbStage.style.transition = '';
      lbStage.style.transform  = '';
      lbBackdrop.style.opacity = '';
    }
    dragDelta = 0;
  };

  lbStage.addEventListener('touchstart', onPointerDown, { passive: true });
  lbStage.addEventListener('touchmove',  onPointerMove,  { passive: true });
  lbStage.addEventListener('touchend',   onPointerUp);
  lbStage.addEventListener('mousedown',  onPointerDown);
  window.addEventListener('mousemove',   onPointerMove);
  window.addEventListener('mouseup',     onPointerUp);

  /* リサイズで開いている時は中央へ再配置 */
  window.addEventListener('resize', () => {
    if (isOpen && !dragging) setStageRect(getTargetRect());
  });

  /* =========================================================
   * 7. Anchor smooth scroll (header nav)
   * ========================================================= */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href.length <= 1) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  });

})();
