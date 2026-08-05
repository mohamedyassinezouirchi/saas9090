const select = value => document.querySelector(value);
const selectAll = value => [...document.querySelectorAll(value)];
const toast = select('.toast');
const demoSteps = [
  { title: 'Detect the material movement.', text: 'Lane compares every meaningful balance against history, plan, and the business context that explains it.', className: 'detect' },
  { title: 'Understand it with sources attached.', text: 'The executed contract, invoice, and GL movement arrive as one grounded explanation—not a trail of tabs.', className: 'understand' },
  { title: 'Decide with an audit-ready record.', text: 'Route the decision to the right owner. The approval, rationale, and evidence become part of the control record.', className: 'decide' }
];
let noticeTimer;
function notify(message) { toast.textContent = message; toast.classList.add('visible'); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => toast.classList.remove('visible'), 4500); }
async function request(path, options = {}) { const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, body: options.body ? JSON.stringify(options.body) : undefined }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Something went wrong.'); return payload; }
function openDialog(id) { const dialog = select(`#${id}`); if (!dialog.open) dialog.showModal(); }
function setAuthMode(mode) { const signingUp = mode === 'signup'; selectAll('.signup-field').forEach(field => { field.hidden = !signingUp; field.querySelector('input').required = signingUp; }); select('#authEyebrow').textContent = signingUp ? 'YOUR CLOSE STARTS HERE' : 'WELCOME BACK'; select('#authTitle').textContent = signingUp ? 'Build your close system.' : 'Pick up where you left off.'; select('#authLead').textContent = signingUp ? 'Create a secure Ledgerlane workspace in minutes.' : 'Sign in to your Ledgerlane workspace.'; select('.auth-submit').innerHTML = signingUp ? 'Create workspace <span>→</span>' : 'Sign in <span>→</span>'; select('#authSwitch').innerHTML = signingUp ? 'Already have an account? <button type="button" data-switch="login">Sign in</button>' : 'New to Ledgerlane? <button type="button" data-switch="signup">Create an account</button>'; select('#authForm').dataset.mode = mode; select('#authError').textContent = ''; }
function setTheme(isDark) { document.documentElement.classList.toggle('theme-dark', isDark); document.documentElement.classList.toggle('theme-light', !isDark); selectAll('.theme-toggle').forEach(button => button.setAttribute('aria-pressed', String(isDark))); localStorage.setItem('ledgerlane-theme', isDark ? 'dark' : 'light'); }
function updateDemo(index) { const step = demoSteps[index]; select('#demoTitle').textContent = step.title; select('#demoText').textContent = step.text; select('.demo-number').textContent = `0${index + 1}`; select('#demoCanvas').className = `demo-canvas ${step.className}`; selectAll('[data-demo]').forEach((button, itemIndex) => { button.setAttribute('aria-selected', String(itemIndex === index)); }); }
selectAll('[data-open]').forEach(button => button.addEventListener('click', () => { if (button.dataset.mode) setAuthMode(button.dataset.mode); openDialog(button.dataset.open); }));
selectAll('[data-close]').forEach(button => button.addEventListener('click', () => select(`#${button.dataset.close}`).close()));
select('#authDialog').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
select('#leadDialog').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
select('#authSwitch').addEventListener('click', event => { const button = event.target.closest('[data-switch]'); if (button) setAuthMode(button.dataset.switch); });
select('#authForm').addEventListener('submit', async event => { event.preventDefault(); const form = event.currentTarget, mode = form.dataset.mode || 'signup', data = Object.fromEntries(new FormData(form)); const submit = form.querySelector('[type="submit"]'); submit.disabled = true; select('#authError').textContent = ''; try { const result = await request(`/api/auth/${mode}`, { method: 'POST', body: data }); location.assign(result.redirect || '/app'); } catch (error) { select('#authError').textContent = error.message; } finally { submit.disabled = false; } });
select('#leadForm').addEventListener('submit', async event => { event.preventDefault(); const form = event.currentTarget, submit = form.querySelector('[type="submit"]'); submit.disabled = true; select('#leadError').textContent = ''; try { const result = await request('/api/leads', { method: 'POST', body: Object.fromEntries(new FormData(form)) }); form.closest('dialog').close(); form.reset(); notify(result.message); } catch (error) { select('#leadError').textContent = error.message; } finally { submit.disabled = false; } });
select('#demoButton').addEventListener('click', async () => { const button = select('#demoButton'); button.disabled = true; try { const result = await request('/api/auth/demo', { method: 'POST', body: {} }); location.assign(result.redirect); } catch (error) { notify(error.message); button.disabled = false; } });
selectAll('[data-demo]').forEach((button, index) => button.addEventListener('click', () => updateDemo(index)));
select('#advanceDemo').addEventListener('click', () => { const active = selectAll('[data-demo]').findIndex(button => button.getAttribute('aria-selected') === 'true'); updateDemo((active + 1) % demoSteps.length); });
select('.theme-toggle').addEventListener('click', () => setTheme(!document.documentElement.classList.contains('theme-dark')));
select('.theme-footer').addEventListener('click', () => setTheme(!document.documentElement.classList.contains('theme-dark')));
const savedTheme = localStorage.getItem('ledgerlane-theme'); setTheme(savedTheme ? savedTheme === 'dark' : true); setAuthMode('signup'); updateDemo(0);
const menuButton = select('.menu-button'); menuButton.addEventListener('click', () => { const open = menuButton.getAttribute('aria-expanded') === 'true'; menuButton.setAttribute('aria-expanded', String(!open)); select('.nav-links').classList.toggle('open', !open); });
const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); } }), { threshold: 0.12 }); selectAll('.reveal').forEach(element => observer.observe(element));

// Keep the 3D scene tied to the document's natural scroll position. One
// requestAnimationFrame write per frame prevents scroll handlers from causing
// layout thrash, and the CSS offers a complete reduced-motion fallback.
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const threeDScene = select('.hero-visual');
const depthSections = selectAll('.bento, .workflow-card, .demo-shell, .security-grid, .quote-grid figure, .pricing-grid article, .final-cta');
let scrollFrame = 0;
function clamp(value, minimum = 0, maximum = 1) { return Math.min(maximum, Math.max(minimum, value)); }
function updateThreeDScroll() {
  scrollFrame = 0;
  if (motionQuery.matches || !threeDScene) return;
  const viewport = window.innerHeight || 1;
  const heroProgress = clamp(window.scrollY / Math.max(1, viewport * 0.9));
  threeDScene.style.setProperty('--scene-tilt-x', `${8 - heroProgress * 18}deg`);
  threeDScene.style.setProperty('--scene-tilt-y', `${-13 + heroProgress * 22}deg`);
  threeDScene.style.setProperty('--scene-lift', `${heroProgress * -72}px`);
  threeDScene.style.setProperty('--scene-scale', `${1 - heroProgress * 0.08}`);
  threeDScene.style.setProperty('--scene-opacity', `${1 - heroProgress * 0.35}`);
  depthSections.forEach((element, index) => {
    const box = element.getBoundingClientRect();
    const progress = clamp((viewport - box.top) / (viewport + box.height));
    const depth = (1 - progress) * 28;
    element.style.setProperty('--depth-y', `${depth}px`);
    element.style.setProperty('--depth-rotate', `${(progress - 0.5) * (index % 2 ? -1.8 : 1.8)}deg`);
    element.style.setProperty('--depth-opacity', `${0.7 + progress * 0.3}`);
  });
}
function requestThreeDUpdate() { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateThreeDScroll); }
if (threeDScene) {
  window.addEventListener('scroll', requestThreeDUpdate, { passive: true });
  window.addEventListener('resize', requestThreeDUpdate, { passive: true });
  motionQuery.addEventListener('change', requestThreeDUpdate);
  requestThreeDUpdate();
}
