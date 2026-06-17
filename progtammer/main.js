/* =========================================
   Loader — namecard "Now Printing"
   Runs immediately so it can overlay everything until window 'load'.
   ========================================= */
(function loaderBoot() {
    const loader  = document.getElementById('loader');
    if (!loader) return;

    const fill    = document.getElementById('loaderFill');
    const percent = document.getElementById('loaderPercent');
    const reduce  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const minDuration = reduce ? 600 : 1700;
    const startedAt = performance.now();
    let pct = 0;

    function tick() {
        const elapsed = performance.now() - startedAt;
        const t = Math.min(1, elapsed / minDuration);
        pct = Math.round((1 - Math.pow(1 - t, 2)) * 100);
        if (fill)    fill.style.transform = 'scaleX(' + (pct / 100) + ')';
        if (percent) percent.textContent  = String(pct).padStart(3, '0');

        if (pct < 100) {
            requestAnimationFrame(tick);
        } else {
            finish();
        }
    }

    function finish() {
        document.body.classList.remove('is-loading');
        document.body.classList.add('is-loaded');
        // Slide-up duration matches CSS .loader transition (1s + 0.25s delay)
        setTimeout(() => {
            loader.classList.add('gone');
            document.dispatchEvent(new CustomEvent('loaderdone'));
        }, 1300);
    }

    if (document.readyState === 'complete') {
        requestAnimationFrame(tick);
    } else {
        window.addEventListener('load', () => requestAnimationFrame(tick));
    }
})();

/* =========================================
   Portfolio — modern interaction layer
   Lenis (smooth scroll) + GSAP ScrollTrigger
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {

    const isDesktop    = window.matchMedia('(min-width: 768px)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- GSAP setup ---------- */
    if (window.gsap && window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
    }

    /* ---------- Lenis smooth scroll ---------- */
    let lenis = null;
    if (window.Lenis && !reduceMotion && isDesktop) {
        lenis = new Lenis({
            lerp: 0.1,
            smoothWheel: true,
            wheelMultiplier: 1,
        });
        lenis.on('scroll', () => { if (window.ScrollTrigger) ScrollTrigger.update(); });
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
    }

    /* ---------- Reveal-on-scroll ---------- */
    document.querySelectorAll('.reveal').forEach((el) => {
        gsap.to(el, {
            opacity: 1,
            y: 0,
            duration: 1.2,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
    });

    /* Hero stagger — fires after loader finishes (or immediately if no loader) */
    const heroLines = document.querySelectorAll('.hero-title > span');
    const triggerHero = () => {
        if (!heroLines.length) return;
        gsap.set(heroLines, { yPercent: 110, opacity: 0 });
        gsap.to(heroLines, {
            yPercent: 0,
            opacity: 1,
            duration: 1.2,
            ease: 'power4.out',
            stagger: 0.12,
        });
    };
    if (document.getElementById('loader') && !document.body.classList.contains('is-loaded')) {
        gsap.set(heroLines, { yPercent: 110, opacity: 0 });
        document.addEventListener('loaderdone', triggerHero, { once: true });
    } else {
        triggerHero();
    }

    /* ---------- Progress bar ---------- */
    const progress = document.getElementById('progress-bar');
    if (progress) {
        ScrollTrigger.create({
            trigger: document.body,
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: (self) => {
                progress.style.width = (self.progress * 100).toFixed(2) + '%';
            },
        });
    }

    /* ---------- Header scrolled state ---------- */
    const header = document.querySelector('.site-header');
    if (header) {
        ScrollTrigger.create({
            start: 60, end: 99999,
            onUpdate: (self) => header.classList.toggle('scrolled', self.scroll() > 60),
        });
    }

    /* Background canvas particles removed — replaced by paper-grid CSS pattern */

    /* ---------- GitHub contribution dummy grid (uses CSS lvl-* tokens) ---------- */
    const grid = document.getElementById('contrib-grid');
    if (grid) {
        const weeks = 26, days = 7;
        for (let i = 0; i < weeks * days; i++) {
            const span = document.createElement('span');
            const v = Math.random();
            let lvl;
            if (v < 0.32)      lvl = 0;
            else if (v < 0.58) lvl = 1;
            else if (v < 0.80) lvl = 2;
            else if (v < 0.94) lvl = 3;
            else               lvl = 4;
            span.className = 'lvl lvl-' + lvl;
            grid.appendChild(span);
        }
    }

    /* ---------- Magnetic buttons (Spring physics) ---------- */
    if (!reduceMotion && isDesktop) {
        document.querySelectorAll('.magnetic').forEach((el) => {
            el.addEventListener('mousemove', (e) => {
                const r = el.getBoundingClientRect();
                const x = (e.clientX - r.left - r.width  / 2) * 0.25;
                const y = (e.clientY - r.top  - r.height / 2) * 0.25;
                gsap.to(el, { x, y, duration: 0.5, ease: 'power3.out' });
            });
            el.addEventListener('mouseleave', () => {
                gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' });
            });
        });
    }

    /* Subtle card tilt on mouse */
    if (!reduceMotion && isDesktop) {
        document.querySelectorAll('.note-card, .work-card').forEach((card) => {
            card.addEventListener('mousemove', (e) => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width  - 0.5;
                const py = (e.clientY - r.top)  / r.height - 0.5;
                gsap.to(card, {
                    rotateX: -py * 3,
                    rotateY:  px * 3,
                    transformPerspective: 1000,
                    duration: 0.5,
                    ease: 'power3.out',
                });
            });
            card.addEventListener('mouseleave', () => {
                gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' });
            });
        });
    }

    /* ---------- Works horizontal pin scroll ---------- */
    const track        = document.getElementById('works-track');
    const pinWrap      = document.getElementById('works-pin-wrap');
    const worksSection = document.getElementById('works');
    const worksProgressBar = document.getElementById('works-progress-bar');
    const worksCurrent     = document.getElementById('works-current');
    const worksTotal       = document.getElementById('works-total');
    const workCards        = document.querySelectorAll('.work-card');

    if (worksTotal) worksTotal.textContent = String(workCards.length).padStart(2, '0');

    if (track && pinWrap && isDesktop && !reduceMotion) {
        const getDistance = () => Math.max(0, track.scrollWidth - window.innerWidth);

        gsap.to(track, {
            x: () => -getDistance(),
            ease: 'none',
            scrollTrigger: {
                trigger: worksSection || pinWrap,
                pin: true,
                start: 'top top',
                end: () => '+=' + getDistance(),
                scrub: 1,
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                    if (worksProgressBar) {
                        worksProgressBar.style.width = (33 + self.progress * 67) + '%';
                    }
                    if (worksCurrent && workCards.length) {
                        const idx = Math.min(
                            workCards.length - 1,
                            Math.round(self.progress * (workCards.length - 1))
                        );
                        worksCurrent.textContent = String(idx + 1).padStart(2, '0');
                    }
                },
            },
        });
    }

    /* ---------- Modal ---------- */
    const modal     = document.getElementById('project-modal');
    const modalCard = document.getElementById('modal-card');
    const closeBtn  = document.getElementById('close-modal');
    const mTitle    = document.getElementById('modal-title');
    const mTech     = document.getElementById('modal-tech');
    const mDesc     = document.getElementById('modal-desc');
    const mLink     = document.getElementById('modal-link');

    const openModal = (card) => {
        if (!modal) return;
        mTitle.textContent = card.dataset.title || '';
        mTech.textContent  = `${card.dataset.year || ''} · ${card.dataset.tech || ''}`;
        mDesc.textContent  = card.dataset.desc || '';
        mLink.setAttribute('href', card.dataset.url || '#');

        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        if (lenis) lenis.stop();
        document.body.style.overflow = 'hidden';

        gsap.fromTo(modalCard,
            { y: 24, opacity: 0, scale: 0.96 },
            { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: 'power3.out' }
        );
    };

    const closeModal = () => {
        if (!modal) return;
        gsap.to(modalCard, {
            y: 16, opacity: 0, scale: 0.97,
            duration: 0.3, ease: 'power2.in',
            onComplete: () => {
                modal.classList.remove('active');
                modal.setAttribute('aria-hidden', 'true');
                if (lenis) lenis.start();
                document.body.style.overflow = '';
            },
        });
    };

    workCards.forEach((c) => {
        c.addEventListener('click', () => openModal(c));
        c.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openModal(c);
            }
        });
        c.setAttribute('tabindex', '0');
        c.setAttribute('role', 'button');
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.classList.contains('active')) closeModal();
    });

    /* ---------- Anchor smooth scroll (Lenis-aware) ---------- */
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href');
            if (!href || href === '#' || href.length < 2) return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            if (lenis) {
                lenis.scrollTo(target, { offset: 0, duration: 1.4 });
            } else {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});
