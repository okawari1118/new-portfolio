document.addEventListener('DOMContentLoaded', () => {
  const textElement = document.getElementById('typewriter-text');
  
  // カーソル要素を取得（ここを追加！）
  // .cursor というクラスを持つ要素を探します
  const cursor = document.querySelector('.cursor');

  const codeBlocks = [
    // ... データの中身はさっきと同じなので省略 ...
    { text: "const", type: "keyword" },
    { text: " ", type: "" },
    { text: "myProfile", type: "variable" },
    { text: " = {\n", type: "punctuation" },
    { text: "  name", type: "property" },
    { text: ": ", type: "punctuation" },
    { text: "\"Ryu Okawa\"", type: "string" },
    { text: ",\n", type: "punctuation" },
    { text: "  role", type: "property" },
    { text: ": ", type: "punctuation" },
    { text: "\"Front-End Engineer\"", type: "string" },
    { text: ",\n", type: "punctuation" },
    { text: "  skills", type: "property" },
    { text: ": [", type: "punctuation" },
    { text: "\"HTML\"", type: "string" },
    { text: ", ", type: "punctuation" },
    { text: "\"CSS\"", type: "string" },
    { text: ", ", type: "punctuation" },
    { text: "\"JS\"", type: "string" },
    { text: ", ", type: "punctuation" },
    { text: "\"PHP\"", type: "string" },
    { text: ", ", type: "punctuation" },
    { text: "\"GA4\"", type: "string" },
    { text: "]\n", type: "punctuation" },
    { text: "};\n\n", type: "punctuation" },
    { text: "// Start coding...", type: "comment" }
  ];

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const typeWriter = async () => {
    
    // 【変更点1】タイピング開始！点滅を止める（クラスを外す）
    // ユーザーがキーボードを叩いている間はカーソルは光りっぱなしです
    if (cursor) cursor.classList.remove('active');

    for (const block of codeBlocks) {
      const span = document.createElement('span');
      if (block.type) span.classList.add(block.type);
      textElement.appendChild(span);

      for (const char of block.text.split('')) {
        span.textContent += char;
        const randomSpeed = Math.floor(Math.random() * 50) + 20; 
        await wait(randomSpeed);
      }
    }

    // 【変更点2】全て打ち終わった！点滅を再開させる（クラスをつける）
    if (cursor) cursor.classList.add('active');
  };

  // 初期状態では点滅させておくために、JS実行前にHTML側で
  // <span class="cursor active">|</span> と書いておくか、
  // ここで強制的にaddしてもOKです。今回はHTML修正の手間を省くためJSで追加します。
  if (cursor) cursor.classList.add('active');

  // 少し待ってから打ち始めると、より「ロードした感」が出ます
  setTimeout(() => {
    typeWriter();
  }, 1000); // 1秒後に開始
});

/* =========================================
   【最終版】マウスドラッグ機能
   （リンク誤爆防止 & 1枚ずつページ送り制御）
  =========================================
*/
  const slider = document.querySelector('.horizontal-slider');
  let isDown = false;
  let startX;
  let startScrollLeft; // ドラッグ開始時のスクロール位置
  let isDragging = false;

// ★修正箇所：ターゲットを「バブル」から「スライド枠」に変更
  const getSlideWidth = () => {
    // 以前: .work-bubble
    // 今回: .project-slide (これが全画面幅を持っているので)
    const slides = slider.querySelectorAll('.project-slide');
    if (slides.length < 2) return 0;
    
    return slides[1].offsetLeft - slides[0].offsetLeft;
  };

  // 補足：
  // 実は今回のCSSで .project-slide は width: 100vw なので
  // const getSlideWidth = () => window.innerWidth; 
  // と書いてしまっても動きますが、上記のコードの方が汎用性が高いです。

  // 1. マウスを押した時
  slider.addEventListener('mousedown', (e) => {
    isDown = true;
    isDragging = false;
    slider.classList.add('active');
    
    startX = e.pageX - slider.offsetLeft;
    startScrollLeft = slider.scrollLeft; // 開始位置を記憶
    
    slider.style.scrollSnapType = 'none'; 
    slider.style.scrollBehavior = 'auto'; 
  });

  // 2. マウスを離した時（ここが修正のキモです！）
  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    slider.classList.remove('active');

    // --- ここから「1枚ずつ制御」のロジック ---
    
    const slideWidth = getSlideWidth();
    // ドラッグした距離（プラスなら左へ、マイナスなら右へドラッグ）
const movedDistance = slider.scrollLeft - startScrollLeft;
    
    // 「現在のページ番号」を計算（開始時の位置 ÷ 1枚の幅）
    const currentIndex = Math.round(startScrollLeft / slideWidth);
    
    let targetIndex = currentIndex;

    // 一定距離（例: 100px）以上ドラッグしていたら、次/前のページへ
    const threshold = 100;

    if (movedDistance > threshold) {
        // 右（次）へ進む（ただし最大で +1 まで！）
        targetIndex = currentIndex + 1;
    } else if (movedDistance < -threshold) {
        // 左（前）へ戻る（ただし最大で -1 まで！）
        targetIndex = currentIndex - 1;
    }
    // ※閾値を超えていなければ currentIndex のまま（元の場所に戻る）

    // インデックスが範囲外に行かないように制限
    const maxIndex = slider.querySelectorAll('.work-bubble').length - 1;
    targetIndex = Math.max(0, Math.min(targetIndex, maxIndex));

    // JSで滑らかに「あるべき位置」へスクロールさせる
    slider.scrollTo({
        left: targetIndex * slideWidth,
        behavior: 'smooth'
    });

    // スクロールが終わった頃を見計らってスナップ機能を復活
    // (すぐに戻すとJSのscrollToと喧嘩するため)
    setTimeout(() => {
        slider.style.scrollSnapType = 'x mandatory';
        isDragging = false;
    }, 500);
  });

  // 3. マウスを動かした時
  slider.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    
    const x = e.pageX - slider.offsetLeft;
    // ★重要：追従係数を少し下げる（* 1 にする）
    // あまり敏感すぎると、少し動かしただけで隣のページが見えすぎてしまうため
    const walk = (x - startX) * 1; 
    
    if (Math.abs(walk) > 5) isDragging = true;
    
    slider.scrollLeft = startScrollLeft - walk;
  });

  /* 4. リンク制御（ここは前回のまま） */
  const links = slider.querySelectorAll('a');
  links.forEach(link => {
      link.addEventListener('click', (e) => {
          if (isDragging) e.preventDefault();
      });
      link.addEventListener('dragstart', (e) => e.preventDefault());
  });




/* =========================================
   スライダー用ナビゲーション制御
  =========================================
*/
  const currentSlideText = document.getElementById('current-slide');
  const totalSlideText = document.getElementById('total-slide');
  const nextBtn = document.getElementById('next-slide-btn');
  
  // スライドの総数を取得して表示
  const slides = slider.querySelectorAll('.project-slide');
  const totalSlides = slides.length;
  // ゼロ埋め（1 -> 01）にする関数
  const formatNum = (num) => num.toString().padStart(2, '0');
  
  if (totalSlideText) totalSlideText.textContent = formatNum(totalSlides);

  // --- 機能1: スクロールしたら番号を更新 ---
  // scrollイベントは頻発するので、負荷軽減のためrequestAnimationFrameを使うのが定石ですが
  // 今回はシンプルに実装します。
  slider.addEventListener('scroll', () => {
    const slideWidth = getSlideWidth();
    // 現在のスクロール位置 ÷ 1枚の幅 = インデックス（四捨五入）
    const index = Math.round(slider.scrollLeft / slideWidth);
    
    // 表示を更新 (+1するのはインデックスが0始まりだから)
    if (currentSlideText) {
        currentSlideText.textContent = formatNum(index + 1);
    }
    
    // 最後のスライドに来たら「次へ」ボタンを消す（あるいは形を変える）などの処理も可能
    if (index === totalSlides - 1) {
        nextBtn.style.opacity = '0.5';
        nextBtn.style.pointerEvents = 'none'; // クリック不可に
    } else {
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'auto';
    }
  });

  // --- 機能2: 矢印ボタンで次へ進む ---
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        const slideWidth = getSlideWidth();
        const currentIndex = Math.round(slider.scrollLeft / slideWidth);
        const nextIndex = currentIndex + 1;
        
        if (nextIndex < totalSlides) {
            slider.scrollTo({
                left: nextIndex * slideWidth,
                behavior: 'smooth'
            });
        }
    });
  }


  /* =========================================
   ドットナビゲーションの連動機能
  =========================================
*/
  const sections = document.querySelectorAll('.snap-area');
  const navDots = document.querySelectorAll('.nav-dot');

  // オプション：画面の50%以上見えたら「現在地」とみなす
  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.5 
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // 現在見えているセクションのIDを取得
        const id = entry.target.getAttribute('id');
        
        // 全てのドットからactiveを外す
        navDots.forEach(dot => dot.classList.remove('active'));
        
        // IDが一致するドットにactiveをつける
        const activeDot = document.querySelector(`.nav-dot[href="#${id}"]`);
        if (activeDot) activeDot.classList.add('active');
      }
    });
  }, observerOptions);

  // 全セクションを監視開始
  sections.forEach(section => observer.observe(section));



/* =========================================
   モーダルウィンドウ制御
  =========================================
*/
  const modal = document.getElementById('project-modal');
  const closeModalBtn = document.getElementById('close-modal');
  
  // 各要素の取得
  const mTitle = document.getElementById('modal-title');
  const mTech = document.getElementById('modal-tech');
  const mDesc = document.getElementById('modal-desc');
  const mLink = document.getElementById('modal-link');

  // 開くボタン（Works内のaタグ）
  // .open-modal-btn というクラスをつけたaタグ全て
  const openButtons = document.querySelectorAll('.open-modal-btn');

  openButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // ★重要：ドラッグ中ならクリック無効（前のコードの isDragging フラグを利用）
        if (typeof isDragging !== 'undefined' && isDragging) return;

        // データ属性から情報を取得
        const title = btn.getAttribute('data-title');
        const tech = btn.getAttribute('data-tech');
        const desc = btn.getAttribute('data-desc');
        const url = btn.getAttribute('data-url');

        // モーダルにセット
        mTitle.textContent = title;
        mTech.textContent = tech;
        mDesc.textContent = desc;
        mLink.setAttribute('href', url);

        // モーダル表示
        modal.classList.add('active');
        
        // 背景スクロールを止める
        document.body.style.overflow = 'hidden';
    });
  });

  // 閉じる処理
  const closeModal = () => {
      modal.classList.remove('active');
      document.body.style.overflow = ''; // スクロール再開
  };

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

  // 背景クリックでも閉じる
  if (modal) {
      modal.addEventListener('click', (e) => {
          if (e.target === modal) closeModal();
      });
  }