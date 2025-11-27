// ===========================
// Mobile Menu Toggle
// ===========================
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenuToggle.classList.toggle('active');
    });
}

// ===========================
// Copy to Clipboard
// ===========================
const copyButtons = document.querySelectorAll('.copy-btn');

copyButtons.forEach(button => {
    button.addEventListener('click', async () => {
        const textToCopy = button.getAttribute('data-copy');

        try {
            await navigator.clipboard.writeText(textToCopy);

            // Visual feedback
            const originalHTML = button.innerHTML;
            button.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M16.667 5L7.5 14.167L3.333 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            button.style.color = '#10b981';

            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.style.color = '';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    });
});

// ===========================
// Smooth Scroll with Offset
// ===========================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');

        // Skip if it's just "#"
        if (href === '#') return;

        e.preventDefault();

        const target = document.querySelector(href);
        if (target) {
            const navbarHeight = document.querySelector('.navbar').offsetHeight;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 20;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });

            // Close mobile menu if open
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            }
        }
    });
});

// ===========================
// Navbar Background on Scroll
// ===========================
const navbar = document.querySelector('.navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        navbar.style.background = 'rgba(10, 10, 15, 0.95)';
        navbar.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
    } else {
        navbar.style.background = 'rgba(10, 10, 15, 0.8)';
        navbar.style.boxShadow = 'none';
    }

    lastScroll = currentScroll;
});

// ===========================
// Intersection Observer for Animations
// ===========================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all feature cards, install cards, and step cards
const animatedElements = document.querySelectorAll('.feature-card, .install-card, .step-card, .release-item');
animatedElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
});

// ===========================
// Add Active State to Nav Links
// ===========================
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-links a[href^="#"]');

window.addEventListener('scroll', () => {
    let current = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });

    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === `#${current}`) {
            item.classList.add('active');
        }
    });
});

// ===========================
// Terminal Animation
// ===========================
function animateTerminal() {
    const codeLines = document.querySelectorAll('.code-line');
    let delay = 0;

    codeLines.forEach((line, index) => {
        line.style.opacity = '0';
        line.style.animation = 'none';
        // Trigger reflow to restart animation
        void line.offsetWidth;
        line.style.animation = `fadeIn 0.5s ease-out ${delay}s forwards`;
        delay += 0.3;
    });
}

// Initial animation on page load
animateTerminal();

// Replay animation when scrolling back to the terminal
const codeWindow = document.querySelector('.code-window');
if (codeWindow) {
    const terminalObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateTerminal();
            }
        });
    }, { threshold: 0.5 });
    
    terminalObserver.observe(codeWindow);
}

// Add fadeIn keyframe animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateX(-10px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    .nav-links.active {
        display: flex;
        flex-direction: column;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: rgba(10, 10, 15, 0.98);
        backdrop-filter: blur(20px);
        padding: var(--spacing-md);
        border-bottom: 1px solid var(--border);
    }
    
    .mobile-menu-toggle.active span:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }
    
    .mobile-menu-toggle.active span:nth-child(2) {
        opacity: 0;
    }
    
    .mobile-menu-toggle.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }
    
    .nav-links a.active {
        color: var(--primary-light);
        background: var(--bg-glass);
    }
`;
document.head.appendChild(style);

// ===========================
// Performance Optimization
// ===========================
// Debounce function for scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debounce to scroll handlers
const debouncedScroll = debounce(() => {
    // Scroll handlers are already defined above
}, 10);

window.addEventListener('scroll', debouncedScroll);

// ===========================
// Console Easter Egg
// ===========================
console.log('%c🚀 Commiter', 'font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;');
console.log('%cAutomate your releases with confidence!', 'font-size: 14px; color: #a1a1aa;');
console.log('%cGitHub: https://github.com/programinglive/commiter', 'font-size: 12px; color: #6366f1;');
console.log('%cNPM: https://www.npmjs.com/package/@programinglive/commiter', 'font-size: 12px; color: #6366f1;');
