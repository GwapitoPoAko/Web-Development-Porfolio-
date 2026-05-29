/**
 * script.js — Nyko Paolo P. Guillero Portfolio
 * Features:
 *  - Page loader
 *  - Sticky navbar + active-link highlight
 *  - Mobile menu toggle
 *  - Dark / Light theme toggle (persisted in localStorage)
 *  - Smooth scroll (CSS handles it, JS fills gaps for buttons)
 *  - Scroll-reveal animations (IntersectionObserver)
 *  - Skill bar animations (triggered on scroll)
 *  - Typing effect in Hero
 *  - Back-to-top button
 *  - Contact form (simulated submit)
 */

/* ──────────────────────────────────────────────
   1. PAGE LOADER
   ────────────────────────────────────────────── */
window.addEventListener("load", () => {
  const loader = document.getElementById("loader");
  // Give a short delay so the animation plays for at least 600ms
  setTimeout(() => {
    loader.classList.add("hidden");
  }, 900);
});


/* ──────────────────────────────────────────────
   2. NAVBAR — scroll shadow + active link
   ────────────────────────────────────────────── */
const navbar   = document.getElementById("navbar");
const sections = document.querySelectorAll("main section[id]");
const navLinks = document.querySelectorAll(".nav-link");

window.addEventListener("scroll", () => {
  // Add background when user scrolls past 20px
  navbar.classList.toggle("scrolled", window.scrollY > 20);

  // Back-to-top button visibility
  backToTop.classList.toggle("visible", window.scrollY > 400);

  // Active link highlight
  highlightNavLink();
});

function highlightNavLink() {
  let current = "";

  sections.forEach((section) => {
    const sectionTop = section.offsetTop - 100;
    if (window.scrollY >= sectionTop) {
      current = section.getAttribute("id");
    }
  });

  navLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href") === `#${current}`) {
      link.classList.add("active");
    }
  });
}


/* ──────────────────────────────────────────────
   3. MOBILE MENU TOGGLE
   ────────────────────────────────────────────── */
const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobileMenu");
const mobileLinks = mobileMenu.querySelectorAll(".nav-link");

menuToggle.addEventListener("click", () => {
  const isOpen = mobileMenu.classList.toggle("open");
  menuToggle.classList.toggle("open", isOpen);
  menuToggle.setAttribute("aria-expanded", isOpen);
});

// Close menu when a link is clicked
mobileLinks.forEach((link) => {
  link.addEventListener("click", () => {
    mobileMenu.classList.remove("open");
    menuToggle.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", false);
  });
});


/* ──────────────────────────────────────────────
   4. DARK / LIGHT THEME TOGGLE
   ────────────────────────────────────────────── */
const themeToggle = document.getElementById("themeToggle");
const themeIcon   = document.getElementById("themeIcon");
const htmlEl      = document.documentElement;

// Load saved preference
const savedTheme = localStorage.getItem("portfolio-theme") || "dark";
htmlEl.setAttribute("data-theme", savedTheme);
updateThemeIcon(savedTheme);

themeToggle.addEventListener("click", () => {
  const current = htmlEl.getAttribute("data-theme");
  const next    = current === "dark" ? "light" : "dark";
  htmlEl.setAttribute("data-theme", next);
  localStorage.setItem("portfolio-theme", next);
  updateThemeIcon(next);
});

function updateThemeIcon(theme) {
  themeIcon.className = theme === "dark" ? "bx bx-sun" : "bx bx-moon";
}


/* ──────────────────────────────────────────────
   5. SCROLL-REVEAL  (IntersectionObserver)
   ────────────────────────────────────────────── */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target); // animate only once
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach((el) => {
  revealObserver.observe(el);
});


/* ──────────────────────────────────────────────
   6. SKILL BAR ANIMATIONS — REMOVED
      Progress bars replaced with label badges.
      No animation needed for skills section.
   ────────────────────────────────────────────── */


/* ──────────────────────────────────────────────
   7. TYPING EFFECT (Hero bio)
   ────────────────────────────────────────────── */
const typingTarget = document.getElementById("typingTarget");
const typingPhrases = [
  "Currently studying Bachelor of Science in Information Technology.",
  "Passionate about Web & Mobile Development.",
  "Turning ideas into working software.",
];

let phraseIndex  = 0;
let charIndex    = 0;
let isDeleting   = false;
const TYPING_SPEED   = 52;   // ms per character
const DELETING_SPEED = 26;
const PAUSE_AFTER    = 2400; // ms to wait before deleting

function type() {
  const current = typingPhrases[phraseIndex];

  if (!isDeleting) {
    // Type forward
    typingTarget.textContent = current.slice(0, charIndex + 1);
    charIndex++;
    if (charIndex === current.length) {
      // Pause then start deleting
      setTimeout(() => { isDeleting = true; requestAnimationFrame(typeLoop); }, PAUSE_AFTER);
      return;
    }
  } else {
    // Delete backward
    typingTarget.textContent = current.slice(0, charIndex - 1);
    charIndex--;
    if (charIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % typingPhrases.length;
    }
  }

  const speed = isDeleting ? DELETING_SPEED : TYPING_SPEED;
  setTimeout(typeLoop, speed);
}

function typeLoop() { type(); }

// Start after loader (~1s)
setTimeout(typeLoop, 1200);


/* ──────────────────────────────────────────────
   8. BACK TO TOP BUTTON
   ────────────────────────────────────────────── */
const backToTop = document.getElementById("backToTop");

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});


/* ──────────────────────────────────────────────
   9. CONTACT FORM (simulated submit)
   ────────────────────────────────────────────── */
const contactForm   = document.getElementById("contactForm");
const formSuccess   = document.getElementById("formSuccess");

contactForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // Simple validation
  const name    = contactForm.querySelector("#name").value.trim();
  const email   = contactForm.querySelector("#email").value.trim();
  const message = contactForm.querySelector("#message").value.trim();

  if (!name || !email || !message) {
    alert("Please fill in all fields before submitting.");
    return;
  }

  // Simulate sending
  const submitBtn = contactForm.querySelector("button[type='submit']");
  submitBtn.disabled  = true;
  submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Sending...';

  setTimeout(() => {
    submitBtn.disabled  = false;
    submitBtn.innerHTML = 'Send Message <i class="bx bx-send"></i>';
    contactForm.reset();
    formSuccess.hidden = false;
    // Hide success after 5s
    setTimeout(() => { formSuccess.hidden = true; }, 5000);
  }, 1800);
});


/* ──────────────────────────────────────────────
   10. SMOOTH SCROLL for anchor buttons
       (CSS scroll-behavior handles most cases;
        this catches edge cases in older browsers)
   ────────────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      e.preventDefault();
      const offset = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue("--nav-h"), 10) || 68;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  });
});


/* ──────────────────────────────────────────────
   11. STAGGERED CARD ANIMATIONS
       Children inside grids get delay via CSS,
       but we also add a small JS-driven class
       so every card in view reveals sequentially.
   ────────────────────────────────────────────── */
const cardObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const cards = entry.target.querySelectorAll(
          ".skill-card, .project-card, .achievement-card"
        );
        cards.forEach((card, i) => {
          setTimeout(() => {
            card.classList.add("visible");
          }, i * 80);
        });
        cardObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08 }
);

document.querySelectorAll(".skills-grid, .projects-grid, .achievements-grid").forEach(
  (grid) => {
    // Initially hide cards for JS-driven reveal
    grid.querySelectorAll(".skill-card, .project-card, .achievement-card").forEach((c) => {
      c.style.opacity  = "0";
      c.style.transform = "translateY(20px)";
      c.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    });
    cardObserver.observe(grid);
  }
);

// Helper to make cards visible (called by cardObserver)
document.querySelectorAll(".skill-card, .project-card, .achievement-card").forEach((c) => {
  c.classList.add = new Proxy(c.classList.add.bind(c.classList), {
    apply(target, thisArg, args) {
      target(...args);
      if (args.includes("visible")) {
        c.style.opacity   = "1";
        c.style.transform = "none";
      }
    },
  });
});