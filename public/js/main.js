// ===== SmartFix - Main JS =====
document.addEventListener('DOMContentLoaded', () => {

  // === Navbar scroll effect ===
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  // === Mobile nav ===
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  const mobileNavClose = document.getElementById('mobileNavClose');

  hamburger.addEventListener('click', () => mobileNav.classList.add('open'));
  mobileNavClose.addEventListener('click', () => mobileNav.classList.remove('open'));
  document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => mobileNav.classList.remove('open'));
  });

  // === Counter animation ===
  const counters = document.querySelectorAll('.stat-number');
  const animateCounter = (el) => {
    const target = +el.dataset.target;
    const duration = 2000;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target).toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString() + (target === 98 ? '%' : '+');
    };
    requestAnimationFrame(step);
  };

  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        counters.forEach(animateCounter);
        statsObserver.disconnect();
      }
    });
  }, { threshold: 0.5 });
  if (counters.length) statsObserver.observe(counters[0].closest('.hero-stats'));

  // === Reveal on scroll ===
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // === FAQ accordion ===
  document.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.parentElement;
      const wasActive = item.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
      if (!wasActive) item.classList.add('active');
    });
  });

  // === Budget form ===
  const form = document.getElementById('budgetForm');
  const submitBtn = document.getElementById('submitBtn');
  const formSuccess = document.getElementById('formSuccess');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Enviando...';

      const data = {
        nombre: form.nombre.value.trim(),
        email: form.email.value.trim(),
        telefono: form.telefono.value.trim(),
        marca: form.marca.value,
        modelo: form.modelo.value.trim(),
        falla: form.falla.value.trim()
      };

      try {
        const res = await fetch('/api/presupuestos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();

        if (res.ok) {
          form.style.display = 'none';
          formSuccess.classList.add('show');
          setTimeout(() => {
            form.style.display = 'block';
            form.reset();
            formSuccess.classList.remove('show');
            submitBtn.disabled = false;
            submitBtn.textContent = '🔧 Enviar Solicitud';
          }, 5000);
        } else {
          alert(result.error || 'Error al enviar');
          submitBtn.disabled = false;
          submitBtn.textContent = '🔧 Enviar Solicitud';
        }
      } catch (err) {
        alert('Error de conexión. Intentá nuevamente.');
        submitBtn.disabled = false;
        submitBtn.textContent = '🔧 Enviar Solicitud';
      }
    });
  }

  // === Smooth scroll for anchors ===
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // === Testimonials slider ===
  const track = document.getElementById('testimonialsTrack');
  const prevBtn = document.getElementById('prevTestimonial');
  const nextBtn = document.getElementById('nextTestimonial');

  if (track && prevBtn && nextBtn) {
    const scrollAmount = 375; // Card width + gap approx
    prevBtn.addEventListener('click', () => {
      track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });
    nextBtn.addEventListener('click', () => {
      track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });
  }
});
