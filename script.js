'use strict';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const memories = document.querySelector('#memorias');
const form = document.querySelector('#unlock-form');
const answer = document.querySelector('#answer');
const feedback = document.querySelector('#answer-feedback');
const scene = document.querySelector('#unlock-scene');
const sceneMessage = document.querySelector('#unlock-message');
let isUnlocking = false;
let isUnlocked = false;
let attempts = 0;

// Uma única observação atende à carta e às memórias que serão reveladas depois.
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.07, rootMargin: '0px 0px -25px 0px' });
  document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
  document.documentElement.classList.add('js');
}

const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

async function showSceneMessage(message) {
  sceneMessage.classList.remove('is-visible');
  await wait(prefersReducedMotion ? 0 : 350);
  sceneMessage.textContent = message;
  sceneMessage.classList.add('is-visible');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isUnlocking || isUnlocked) return;

  // A brincadeira é local: aceita qualquer capitalização e espaços nas extremidades.
  if (answer.value.trim().toLowerCase() !== 'eu te amo') {
    const messages = ['hmm... tenta de novo', 'a resposta tava bem na sua frente, bobinha', 'vc não prestou atenção direito KKKKKKK'];
    feedback.textContent = messages[attempts % messages.length];
    attempts += 1;
    answer.setAttribute('aria-invalid', 'true');
    const row = form.querySelector('.input-row');
    row.classList.remove('retry');
    void row.offsetWidth;
    row.classList.add('retry');
    answer.focus({ preventScroll: true });
    return;
  }

  isUnlocking = true;
  feedback.textContent = '';
  answer.removeAttribute('aria-invalid');
  form.querySelector('button').disabled = true;
  form.classList.add('leaving');
  answer.blur();
  await wait(prefersReducedMotion ? 0 : 650);
  scene.hidden = false;
  document.body.classList.add('modal-open');
  // Dois frames garantem a transição a partir de display:none.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  scene.classList.add('is-visible');
  await showSceneMessage('eu sabia que vc ia lembrar');
  await wait(1800);
  await showSceneMessage('agora acho que posso te mostrar isso...');
  await wait(1900);

  memories.hidden = false;
  isUnlocked = true;
  form.hidden = true;
  document.querySelector('.surprise-lead').textContent = 'tem coisas que eu guardei com carinho. vem ver.';
  document.body.classList.remove('modal-open');
  memories.scrollIntoView({ behavior: 'instant', block: 'start' });
  scene.classList.remove('is-visible');
  await wait(prefersReducedMotion ? 0 : 1000);
  scene.hidden = true;
  // Leva o leitor de tela à seção revelada sem alterar a posição do scroll.
  const title = document.querySelector('#memories-title');
  title.tabIndex = -1;
  title.focus({ preventScroll: true });
  isUnlocking = false;
  updateProgress();
});

answer.addEventListener('input', () => {
  answer.removeAttribute('aria-invalid');
  feedback.textContent = '';
});

// O lightbox suporta teclado, botões e deslize. Nenhuma imagem é recortada.
const lightbox = document.querySelector('#lightbox');
const lightboxImage = document.querySelector('#lightbox-image');
const memoryButtons = [...document.querySelectorAll('.memory-open')];
let currentImage = 0;
let lastMemoryButton;
let touchStart = null;

function setLightboxImage(index) {
  currentImage = (index + memoryButtons.length) % memoryButtons.length;
  const button = memoryButtons[currentImage];
  const source = button.querySelector('img');
  lightboxImage.src = source.getAttribute('src');
  lightboxImage.alt = source.alt;
  document.querySelector('#lightbox-counter').textContent = `${String(currentImage + 1).padStart(2, '0')} / ${String(memoryButtons.length).padStart(2, '0')}`;
  const caption = button.closest('figure').querySelector('figcaption');
  document.querySelector('#lightbox-caption').textContent = caption.querySelector('span:nth-child(2)')?.textContent || caption.textContent;
}

memoryButtons.forEach((button, index) => {
  button.addEventListener('click', () => {
    if (!isUnlocked) return;
    lastMemoryButton = button;
    setLightboxImage(index);
    lightbox.showModal();
    document.body.classList.add('modal-open');
    document.querySelector('#lightbox-close').focus();
  });
});

document.querySelector('#lightbox-close').addEventListener('click', () => lightbox.close());
document.querySelector('#lightbox-prev').addEventListener('click', () => setLightboxImage(currentImage - 1));
document.querySelector('#lightbox-next').addEventListener('click', () => setLightboxImage(currentImage + 1));
lightbox.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  lastMemoryButton?.focus({ preventScroll: true });
});
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox || event.target.classList.contains('lightbox-stage')) lightbox.close();
});
lightbox.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') { event.preventDefault(); setLightboxImage(currentImage - 1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); setLightboxImage(currentImage + 1); }
});
lightboxImage.addEventListener('touchstart', (event) => {
  touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
}, { passive: true });
lightboxImage.addEventListener('touchend', (event) => {
  if (!touchStart) return;
  const deltaX = event.changedTouches[0].clientX - touchStart.x;
  const deltaY = event.changedTouches[0].clientY - touchStart.y;
  if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
    setLightboxImage(currentImage + (deltaX < 0 ? 1 : -1));
  }
  touchStart = null;
}, { passive: true });
lightboxImage.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });

// Atualização limitada a um frame para manter a rolagem leve no celular.
let ticking = false;
function updateProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
  document.querySelector('.reading-progress span').style.transform = `scaleX(${progress})`;
}
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => { updateProgress(); ticking = false; });
    ticking = true;
  }
}, { passive: true });
window.addEventListener('resize', updateProgress);
updateProgress();
