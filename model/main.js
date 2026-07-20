/* =========================================
   Sakura Miya — Portfolio interactions (Optimized)
   ========================================= */

(() => {
  'use strict';

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const isTouch = matchMedia('(hover: none)').matches;
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
   * 1. Smooth (inertia) scroll — Desktop only & Performance Optimized
   * ========================================================= */
  let scrollY = window.scrollY;
  let smoothY = scrollY;
  let rafId = null;
  let isScrolling = false;

  function rafScroll() {
    smoothY = lerp(smoothY, scrollY, 0.10);
    
    if (Math.abs(smoothY - scrollY) < 0.05) {
      smoothY = scrollY;
      isScrolling = false;
    }

    document.dispatchEvent(new CustomEvent('smoothscroll', { detail: { y: smoothY } }));

    if (isScrolling) {
      rafId = requestAnimationFrame(rafScroll);
    } else {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // prefersReduced が有効な場合は、パララックス等の計算自体をスキップさせるためイベントのみ同期
  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    if (prefersReduced) {
      document.dispatchEvent(new CustomEvent('smoothscroll', { detail: { y: scrollY } }));
      return;
    }
    if (!isScrolling) {
      isScrolling = true;
      if (!rafId) rafId = requestAnimationFrame(rafScroll);
    }
  }, { passive: true });

  /* =========================================================
   * 2. Loader : Blur-to-Focus + progress
   * ========================================================= */
  const loader   = document.getElementById('loader');
  const fill     = document.getElementById('loaderFill');
  const percent  = document.getElementById('loaderPercent');

  let progress = 0;
  const minDuration = 1400;
  const startedAt   = performance.now();

  function tickLoader() {
    const elapsed = performance.now() - startedAt;
    const t = clamp(elapsed / minDuration, 0, 1);
    progress = Math.round((1 - Math.pow(1 - t, 2)) * 100);
    
    if (fill) fill.style.inset = `0 ${100 - progress}% 0 0`;
    if (percent) percent.textContent = String(progress).padStart(3, '0');

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
      if (loader) loader.classList.add('gone');
      window.dispatchEvent(new Event('scroll'));
    }, 1000);
  }

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
    if (!mvSection || !mvMedia || !mvContent || prefersReduced) return;
    const h = mvSection.offsetHeight;
    const t = clamp(y / h, 0, 1);

    const translateMedia  = -t * 80;
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
   * ========================================================= */
  const galleryItems = document.querySelectorAll('.gallery-item');
  const galleryGrid  = document.getElementById('galleryGrid');

  function updateGallery(y) {
    if (!galleryGrid || galleryItems.length === 0 || prefersReduced) return;
    const rect = galleryGrid.getBoundingClientRect();
    const vh   = window.innerHeight;
    if (rect.bottom < 0 || rect.top > vh) return;

    const progress = (vh - rect.top) / (vh + rect.height);
    const offset   = (progress - 0.5) * 80;

    galleryItems.forEach(item => {
      const isLeft = item.classList.contains('col-l');
      const factor = isLeft ? 0.45 : -0.55;
      const translate = offset * factor;
      item.style.setProperty('--parallax', `${translate}px`);
    });
  }

  document.addEventListener('smoothscroll', (e) => updateGallery(e.detail.y));

  /* =========================================================
   * 6. Lightbox — Shared Element Transition + Dynamic Listeners
   * ========================================================= */
  const lightbox   = document.getElementById('lightbox');
  const lbStage    = document.getElementById('lbStage');
  const lbImg      = document.getElementById('lbImg');
  const lbClose    = document.getElementById('lbClose');
  const lbCaption  = document.getElementById('lbCaption');
  const lbBackdrop = document.getElementById('lbBackdrop');

  let activeThumb = null;
  let isOpen      = false;
  let dragStartY  = 0;
  let dragDelta   = 0;
  let dragging    = false;

  function getTargetRect() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const imgRatio = lbImg.naturalWidth / lbImg.naturalHeight || 0.8;
    const maxW = vw * 0.92;
    const maxH = vh * 0.86;
    let w = maxW, h = w / imgRatio;
    if (h > maxH) { h = maxH; w = h * imgRatio; }
    return {
      top:   (vh - h) / 2,
      left:  (vw - w) / 2,
      width: w, height: h
    };
  }

  function setStageRect(rect) {
    if (!lbStage) return;
    lbStage.style.top    = rect.top    + 'px';
    lbStage.style.left   = rect.left   + 'px';
    lbStage.style.width  = rect.width  + 'px';
    lbStage.style.height = rect.height + 'px';
  }

  function openLightbox(thumb) {
    if (isOpen || !lightbox || !lbStage || !lbImg) return;
    activeThumb = thumb;
    const innerImg = thumb.querySelector('img');
    if (!innerImg) return;
    
    const rect = innerImg.getBoundingClientRect();
    lbImg.src = innerImg.currentSrc || innerImg.src;

    if (lbCaption) {
      const num = thumb.querySelector('.gi-num')?.textContent || '';
      const cat = thumb.querySelector('.gi-cat')?.textContent || '';
      const numEl = lbCaption.querySelector('.lb-num');
      const catEl = lbCaption.querySelector('.lb-cat');
      if (numEl) numEl.textContent = num;
      if (catEl) catEl.textContent = cat;
    }

    lbStage.style.transition = 'none';
    setStageRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    innerImg.style.opacity = '0';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        lbStage.style.transition = prefersReduced ? 'none' : '';
        setStageRect(getTargetRect());
      });
    });

    isOpen = true;
  }

  function closeLightbox() {
    if (!isOpen || !activeThumb || !lightbox || !lbStage) return;
    const innerImg = activeThumb.querySelector('img');
    const rect = innerImg ? innerImg.getBoundingClientRect() : { top: 0, left: 0, width: 0, height: 0 };

    lightbox.classList.add('is-closing');
    lightbox.classList.remove('is-dragging');

    lbStage.style.transition = prefersReduced ? 'none' : '';
    lbStage.style.transform  = '';
    
    if (innerImg) {
      setStageRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    }

    setTimeout(() => {
      lightbox.classList.remove('is-open', 'is-closing');
      lbStage.style.transition = 'none';
      lbStage.style.transform  = '';
      lbImg.src = '';
      if (innerImg) innerImg.style.opacity = '';
      document.body.style.overflow = '';
      if (lbBackdrop) lbBackdrop.style.opacity = '';
      isOpen = false;
      activeThumb = null;
    }, prefersReduced ? 0 : 600);
  }

  galleryItems.forEach(item => {
    item.addEventListener('click', () => openLightbox(item));
  });
  
  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lbBackdrop) lbBackdrop.addEventListener('click', closeLightbox);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  /* ----- Swipe-to-close (Optimized Event Listeners) ----- */
  const onPointerDown = (e) => {
    if (!isOpen) return;
    if (e.target.closest('.lb-close')) return;
    dragging = true;
    dragStartY = (e.touches ? e.touches[0].clientY : e.clientY);
    dragDelta = 0;
    lightbox.classList.add('is-dragging');

    // ドラッグ開始時のみイベントをwindowに登録
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);
  };

  const onPointerMove = (e) => {
    if (!dragging || !lbStage || !lbBackdrop) return;
    const y = (e.touches ? e.touches[0].clientY : e.clientY);
    dragDelta = y - dragStartY;
    if (dragDelta < 0) dragDelta = dragDelta * 0.3; // 上方向の抵抗
    
    const scale = clamp(1 - Math.abs(dragDelta) / 1200, 0.7, 1);
    const opa   = clamp(1 - Math.abs(dragDelta) / 600, 0.2, 1);
    
    lbStage.style.transform   = `translate3d(0, ${dragDelta}px, 0) scale(${scale})`;
    lbBackdrop.style.opacity  = String(opa);
  };

  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    if (lightbox) lightbox.classList.remove('is-dragging');

    // 不要になったグローバルイベントリスナーを即座に破棄
    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('touchmove', onPointerMove);
    window.removeEventListener('mouseup', onPointerUp);
    window.removeEventListener('touchend', onPointerUp);

    if (Math.abs(dragDelta) > 120) {
      closeLightbox();
    } else {
      if (lbStage) {
        lbStage.style.transition = '';
        lbStage.style.transform  = '';
      }
      if (lbBackdrop) lbBackdrop.style.opacity = '';
    }
    dragDelta = 0;
  };

  if (lbStage) {
    lbStage.addEventListener('touchstart', onPointerDown, { passive: true });
    lbStage.addEventListener('mousedown', onPointerDown);
  }

  // リサイズハンドラのデバウンス処理（簡易版）
  let resizeTimeout;
  window.addEventListener('resize', () => {
    if (!isOpen || dragging) return;
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      setStageRect(getTargetRect());
    }, 100);
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




// 1. YouTube Player API のコードを非同期で読み込む
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

let player;
const videoId = '_CpqAbHwPK0'; // ★ここにYouTubeの動画IDを入力

// 2. APIの読み込みが完了したら自動的に呼ばれる関数
function onYouTubeIframeAPIReady() {
  player = new YT.Player('youtube-player', {
    videoId: videoId,
    playerVars: {
      'autoplay': 1,       // 自動再生
      'mute': 1,           // ミュート（自動再生の必須条件）
      'loop': 1,           // ループ再生（playlist指定と組み合わせる）
      'playlist': videoId, // ループさせるために同じ動画IDを指定
      'controls': 0,       // コントローラー非表示
      'disablekb': 1,      // キーボード操作を無効化
      'fs': 0,             // 全画面表示ボタンを非表示
      'iv_load_policy': 3, // アノテーション（注釈）を非表示
      'rel': 0,            // 関連動画を非表示
      'showinfo': 0,       // 動画情報を非表示（廃止気味ですが念のため）
      'modestbranding': 1  // YouTubeロゴを控えめにする
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

// 3. プレイヤーの準備が整ったとき
function onPlayerReady(event) {
  event.target.mute(); // 確実にミュートにする
  event.target.playVideo(); // 再生開始
}

// 4. プレイヤーの状態が変化したとき（チラつき防止の肝）
function onPlayerStateChange(event) {
  const wrapper = document.querySelector('.mv-video-wrapper');
  
  // event.data === 1 は「再生中（YT.PlayerState.PLAYING）」
  if (event.data === YT.PlayerState.PLAYING) {
    // 再生が確実に始まってからクラスを付与し、フェードインさせる
    wrapper.classList.add('is-playing');
  }
}