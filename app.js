const $ = (selector) => document.querySelector(selector);
const toast = $('.toast');
let toastTimer;
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
function notify(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3200); }
async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed');
  return payload;
}
function initials(name) { return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(); }
function timeAgo(value) { const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000)); return minutes < 60 ? `${minutes} min ago` : minutes < 1440 ? `${Math.round(minutes / 60)} hr ago` : `${Math.round(minutes / 1440)} days ago`; }
function exceptionMarkup(item) {
  const style = item.severity === 'material' ? ['warning', '!', 'coral-tag', 'Material'] : item.severity === 'review' ? ['purple', '✦', 'purple-tag', 'AI draft'] : ['blue', '↗', 'blue-tag', 'Control'];
  return `<button class="attention-row" data-exception-id="${item.id}" data-title="${escapeHtml(item.title)}"><span class="row-icon ${style[0]}">${style[1]}</span><span class="row-main"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description)}</small></span><span class="tag ${style[2]}">${style[3]}</span><span class="owner">${initials(item.assignee || 'Lane')}</span><span class="row-arrow">→</span></button>`;
}
function activityMarkup(item) {
  const icon = item.action === 'completed' ? ['done', '✓'] : item.action === 'drafted' ? ['ai', '✦'] : ['person', initials(item.actor_name || 'Lane')];
  let meta = {}; try { meta = JSON.parse(item.metadata); } catch { /* Stored metadata is non-critical display content. */ }
  return `<div class="activity-item"><span class="timeline ${icon[0]}">${icon[1]}</span><div><strong>${escapeHtml(meta.title || item.action)}</strong><p>${escapeHtml(meta.detail || `${item.entity_type} updated`)}</p></div><time>${timeAgo(item.created_at)}</time></div>`;
}
async function loadDashboard() {
  let model;
  try { model = await api('/api/dashboard'); } catch (error) { if (error.message === 'Sign in required') { await api('/api/auth/demo', { method: 'POST', body: '{}' }); model = await api('/api/dashboard'); } else throw error; }
  const { user, metrics, exceptions, workflows, activity } = model;
  $('#organizationName').textContent = user.organization;
  $('#profileName').textContent = user.name;
  $('#profileRole').textContent = user.role;
  $('#profileInitials').textContent = initials(user.name);
  $('#greeting').textContent = `Good morning, ${user.name.split(' ')[0]}.`;
  $('#closeProgress').textContent = `${metrics.closeProgress}% complete`;
  $('#closeHealth').innerHTML = `${metrics.closeHealth}<span>/100</span>`;
  $('#healthBar').style.width = `${metrics.closeHealth}%`;
  $('#automatedHours').innerHTML = `${metrics.automatedHours}<span> hrs</span>`;
  $('#exceptionCount').textContent = metrics.exceptionCount;
  $('#exceptionAmount').textContent = metrics.exceptionAmount;
  $('#evidenceCoverage').innerHTML = `${metrics.evidenceCoverage}<span>%</span>`;
  $('#workflowCount').textContent = workflows.length;
  $('#attentionTitle').textContent = exceptions.length ? `${exceptions.length} item${exceptions.length === 1 ? '' : 's'} are blocking your close` : 'Your close is clear';
  $('#attentionList').innerHTML = exceptions.length ? exceptions.map(exceptionMarkup).join('') : '<div class="empty-state">No open exceptions. Lane is watching for new risks.</div>';
  $('#activityList').innerHTML = activity.map(activityMarkup).join('') || '<div class="empty-state">Your decisions will appear here.</div>';
}
$('#newWorkflow').addEventListener('click', () => $('#workflowDialog').showModal());
$('#askLane').addEventListener('click', () => $('#laneDialog').showModal());
document.querySelectorAll('.playbooks button').forEach(button => button.addEventListener('click', async event => { event.preventDefault(); try { const type = button.value; const result = await api('/api/workflows', { method: 'POST', body: JSON.stringify({ type }) }); $('#workflowDialog').close(); notify(`${result.workflow.title} created. Lane is ready to configure it.`); await loadDashboard(); } catch (error) { notify(error.message); } }));
$('#attentionList').addEventListener('click', async event => { const row = event.target.closest('[data-exception-id]'); if (!row) return; try { await api(`/api/exceptions/${row.dataset.exceptionId}/resolve`, { method: 'POST', body: '{}' }); notify(`${row.dataset.title} resolved and recorded in the audit trail.`); await loadDashboard(); } catch (error) { notify(error.message); } });
document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => { const target = document.querySelector(link.getAttribute('href')); if (target) { event.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }));
document.querySelectorAll('.prompt-chips button').forEach(button => button.addEventListener('click', () => { const input = $('.chat-prompt input'); input.value = button.textContent; input.focus(); }));
document.querySelectorAll('.dialog-close').forEach(button => button.addEventListener('click', () => button.closest('dialog')?.close()));
$('#laneForm').addEventListener('submit', async event => { event.preventDefault(); const input = $('#laneQuestion'), response = $('#laneResponse'), submit = event.currentTarget.querySelector('[type="submit"]'); if (!input.value.trim()) return; submit.disabled = true; response.textContent = 'Lane is grounding an answer in this close…'; try { const result = await api('/api/intelligence/brief', { method: 'POST', body: JSON.stringify({ question: input.value }) }); response.textContent = `${result.answer} Sources: ${result.sources.join(' · ')}`; } catch (error) { response.textContent = error.message; } finally { submit.disabled = false; } });
$('#viewPlan').addEventListener('click', async () => { try { await api('/api/billing'); $('#billingDialog').showModal(); } catch (error) { notify(error.message); } });
document.querySelectorAll('.billing-plan').forEach(button => button.addEventListener('click', async () => { button.disabled = true; try { const result = await api('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ plan: button.dataset.plan }) }); window.location.assign(result.checkoutUrl); } catch (error) { notify(error.message); button.disabled = false; } }));
loadDashboard().catch(error => notify(`Unable to load Ledgerlane: ${error.message}`));
