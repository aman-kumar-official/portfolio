/* ============================================================
   AMAN KUMAR SINGH — PORTFOLIO SCRIPTS
   Clean, bug-free, feature-rich vanilla JavaScript
   ============================================================ */

'use strict';

// ===== HELPERS =====
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ===== CUSTOM CURSOR =====
(function initCursor() {
    const dot = qs('#cursorDot');
    const ring = qs('#cursorRing');
    if (!dot || !ring) return;

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        dot.style.left = mouseX + 'px';
        dot.style.top = mouseY + 'px';
    });

    function animateRing() {
        ringX += (mouseX - ringX) * 0.12;
        ringY += (mouseY - ringY) * 0.12;
        ring.style.left = ringX + 'px';
        ring.style.top = ringY + 'px';
        requestAnimationFrame(animateRing);
    }
    animateRing();

    // Enlarge ring on interactive elements
    const hoverTargets = 'a, button, .filter-btn, .portfolio-card, .service-card, .skill-tag';
    document.addEventListener('mouseover', (e) => {
        if (e.target.closest(hoverTargets)) {
            document.body.classList.add('cursor-hover');
        }
    });
    document.addEventListener('mouseout', (e) => {
        if (e.target.closest(hoverTargets)) {
            document.body.classList.remove('cursor-hover');
        }
    });
})();


// ===== NAVIGATION =====
(function initNav() {
    const header = qs('#header');
    const hamburger = qs('#hamburger');
    const navLinks = qs('#navLinks');
    const navItems = qsa('#navLinks .nav-link');

    if (!header) return;

    // Sticky header on scroll
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });

    // Hamburger toggle with overlay
    let overlay = null;
    function createOverlay() {
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.classList.add('nav-overlay');
        document.body.appendChild(overlay);
        overlay.addEventListener('click', closeMenu);
    }

    function openMenu() {
        createOverlay();
        navLinks && navLinks.classList.add('open');
        hamburger && hamburger.classList.add('active');
        hamburger && hamburger.setAttribute('aria-expanded', 'true');
        if (overlay) overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        navLinks && navLinks.classList.remove('open');
        hamburger && hamburger.classList.remove('active');
        hamburger && hamburger.setAttribute('aria-expanded', 'false');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            const isOpen = navLinks && navLinks.classList.contains('open');
            isOpen ? closeMenu() : openMenu();
        });
    }

    // Close nav when a link is clicked
    navItems.forEach(item => item.addEventListener('click', closeMenu));

    // Escape key closes menu
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });

    // Active nav link on scroll (IntersectionObserver)
    const sections = qsa('section[id]');
    if (sections.length) {
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navItems.forEach(link => {
                        link.classList.toggle('active', link.getAttribute('data-section') === id);
                    });
                }
            });
        }, { rootMargin: '-40% 0px -55% 0px' });

        sections.forEach(section => sectionObserver.observe(section));
    }
})();


// ===== SMOOTH SCROLL =====
(function initSmoothScroll() {
    document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a[href^="#"]');
        if (!anchor) return;
        const href = anchor.getAttribute('href');
        if (!href || href === '#') return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        const headerHeight = qs('#header')?.offsetHeight || 80;
        const top = target.getBoundingClientRect().top + window.scrollY - headerHeight;
        window.scrollTo({ top, behavior: 'smooth' });
    });
})();


// ===== TYPING ANIMATION =====
(function initTyping() {
    const el = qs('#typedText');
    if (!el) return;

    const roles = [
        'Full Stack Developer',
        'AI/ML Enthusiast',
    ];

    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingTimeout;

    function type() {
        const current = roles[roleIndex];

        if (isDeleting) {
            charIndex--;
        } else {
            charIndex++;
        }

        el.textContent = current.substring(0, charIndex);

        let delay = isDeleting ? 60 : 100;

        if (!isDeleting && charIndex === current.length) {
            delay = 2000; // Pause at end
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
            delay = 400;
        }

        typingTimeout = setTimeout(type, delay);
    }

    // Start after a short delay
    setTimeout(type, 800);
})();


// ===== SCROLL REVEAL ANIMATIONS =====
(function initScrollReveal() {
    const elements = qsa('[data-reveal]');
    if (!elements.length) return;

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    elements.forEach(el => revealObserver.observe(el));
})();


// ===== SKILL BAR ANIMATION =====
(function initSkillBars() {
    const bars = qsa('.bar-fill');
    if (!bars.length) return;

    const barObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bar = entry.target;
                const width = bar.getAttribute('data-width');
                if (width) {
                    // Small delay to let the reveal animation finish
                    setTimeout(() => {
                        bar.style.width = width + '%';
                    }, 200);
                }
                barObserver.unobserve(bar);
            }
        });
    }, { threshold: 0.3 });

    bars.forEach(bar => barObserver.observe(bar));
})();


// ===== PORTFOLIO FILTER =====
(function initPortfolioFilter() {
    const filterBtns = qsa('.filter-btn');
    const portfolioCards = qsa('.portfolio-card');
    if (!filterBtns.length || !portfolioCards.length) return;

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');

            portfolioCards.forEach((card, i) => {
                const category = card.getAttribute('data-category');
                const show = filter === 'all' || category === filter;

                // Animate out then toggle visibility
                card.style.transition = `opacity 0.25s ease ${i * 0.03}s, transform 0.25s ease ${i * 0.03}s`;

                if (show) {
                    card.style.display = '';
                    // Force reflow
                    void card.offsetHeight;
                    card.style.opacity = '1';
                    card.style.transform = '';
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        if (btn.getAttribute('data-filter') !== filter) return;
                        card.style.display = 'none';
                    }, 250 + i * 30);
                }
            });
        });
    });
})();


// ===== BACK TO TOP =====
(function initBackToTop() {
    const btn = qs('#backToTop');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
})();


// ===== CONTACT FORM =====
(function initContactForm() {
    const form = qs('#contactForm');
    const feedback = qs('#formFeedback');
    const submitBtn = qs('#contactSubmitBtn');
    if (!form) return;

    // ── Configuration ──
    // For local dev with Vercel CLI: '/api/contact'
    // For production on Vercel: '/api/contact' (same-origin)
    // If backend is hosted elsewhere, use full URL e.g. 'https://your-api.vercel.app/api/contact'
    const API_URL = '/api/contact';

    let isSubmitting = false;
    let feedbackTimer = null;

    // ── Field references ──
    const fields = {
        name: qs('#contactName', form),
        email: qs('#contactEmail', form),
        phone: qs('#contactPhone', form),
        company: qs('#contactCompany', form),
        subject: qs('#contactSubject', form),
        message: qs('#contactMessage', form),
        website: qs('#contactWebsite', form) // honeypot
    };

    // ── Validation rules ──
    function validateField(fieldName, value) {
        switch (fieldName) {
            case 'name':
                if (!value) return 'Full name is required.';
                if (value.length < 2) return 'Name must be at least 2 characters.';
                if (value.length > 100) return 'Name must be under 100 characters.';
                return '';
            case 'email':
                if (!value) return 'Email address is required.';
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address.';
                return '';
            case 'phone':
                if (value && !/^[\d\s\+\-\(\)\.]{7,20}$/.test(value)) return 'Please enter a valid phone number.';
                return '';
            case 'message':
                if (!value) return 'Message is required.';
                if (value.length < 10) return 'Message must be at least 10 characters.';
                if (value.length > 5000) return 'Message must be under 5000 characters.';
                return '';
            default:
                return '';
        }
    }

    // ── Show/clear inline field errors ──
    function showFieldError(fieldName, message) {
        const input = fields[fieldName];
        const errorEl = qs(`#contact${capitalize(fieldName)}Error`);
        if (input) input.classList.toggle('error', !!message);
        if (errorEl) errorEl.textContent = message || '';
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function clearAllFieldErrors() {
        ['name', 'email', 'phone', 'message'].forEach(field => showFieldError(field, ''));
    }

    // ── Inline validation on blur ──
    ['name', 'email', 'phone', 'message'].forEach(fieldName => {
        const input = fields[fieldName];
        if (!input) return;
        input.addEventListener('blur', () => {
            const value = input.value.trim();
            // Only validate if user has interacted (not empty optional fields)
            if (value || input.required) {
                const error = validateField(fieldName, value);
                showFieldError(fieldName, error);
            }
        });
        // Clear error on input
        input.addEventListener('input', () => {
            if (input.classList.contains('error')) {
                const value = input.value.trim();
                const error = validateField(fieldName, value);
                if (!error) showFieldError(fieldName, '');
            }
        });
    });

    // ── Form submission ──
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Prevent duplicate submissions
        if (isSubmitting) return;

        // Clear previous feedback
        hideFeedback();
        clearAllFieldErrors();

        // Gather values
        const data = {
            name: fields.name?.value.trim() || '',
            email: fields.email?.value.trim() || '',
            phone: fields.phone?.value.trim() || '',
            company: fields.company?.value.trim() || '',
            subject: fields.subject?.value.trim() || '',
            message: fields.message?.value.trim() || '',
            website: fields.website?.value.trim() || '' // honeypot
        };

        // Client-side validation
        let hasErrors = false;
        ['name', 'email', 'phone', 'message'].forEach(fieldName => {
            const error = validateField(fieldName, data[fieldName]);
            if (error) {
                showFieldError(fieldName, error);
                hasErrors = true;
            }
        });

        if (hasErrors) {
            // Focus the first field with an error
            const firstError = form.querySelector('.form-control.error');
            if (firstError) firstError.focus();
            return;
        }

        // ── Submit ──
        isSubmitting = true;
        setLoading(true);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showFeedback(
                    '✓ Thank you! Your message has been sent successfully. We\'ll get back to you soon.',
                    'success'
                );
                form.reset();
                clearAllFieldErrors();
                // Auto-hide success message after 8 seconds
                feedbackTimer = setTimeout(() => hideFeedback(), 8000);
            } else if (response.status === 429) {
                showFeedback(
                    'Too many submissions. Please wait a few minutes before trying again.',
                    'error'
                );
            } else if (response.status === 400 && result.errors) {
                // Server-side validation errors — show inline
                result.errors.forEach(err => {
                    if (err.field && fields[err.field]) {
                        showFieldError(err.field, err.message);
                    }
                });
                showFeedback('Please fix the errors above and try again.', 'error');
            } else {
                showFeedback(
                    result.message || 'Sorry, something went wrong. Please try again later.',
                    'error'
                );
            }
        } catch (err) {
            // Network error or server unreachable
            showFeedback(
                'Network error — please check your connection and try again. You can also email me directly at contact.amankumarsingh@gmail.com',
                'error'
            );
        } finally {
            isSubmitting = false;
            setLoading(false);
        }
    });

    // ── UI helpers ──
    function showFeedback(message, type) {
        if (!feedback) return;
        if (feedbackTimer) clearTimeout(feedbackTimer);
        feedback.textContent = message;
        feedback.className = 'form-feedback ' + type;
        feedback.style.display = 'block';
    }

    function hideFeedback() {
        if (!feedback) return;
        if (feedbackTimer) clearTimeout(feedbackTimer);
        feedback.textContent = '';
        feedback.className = 'form-feedback';
        feedback.style.display = 'none';
    }

    function setLoading(isLoading) {
        if (!submitBtn) return;
        const btnText = qs('.btn-text', submitBtn);
        const spinner = qs('.btn-spinner', submitBtn);
        const icon = submitBtn.querySelector('i');

        if (isLoading) {
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            if (btnText) btnText.textContent = 'Sending...';
            if (spinner) spinner.style.display = 'inline-block';
            if (icon) icon.style.display = 'none';
        } else {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            if (btnText) btnText.textContent = 'Send Message';
            if (spinner) spinner.style.display = 'none';
            if (icon) icon.style.display = '';
        }
    }
})();


// ===== SECTION TAG STAGGER (optional extra polish) =====
(function initSectionTagReveal() {
    const tags = qsa('.section-tag');
    tags.forEach((tag, i) => {
        tag.style.transitionDelay = (i * 0.05) + 's';
    });
})();