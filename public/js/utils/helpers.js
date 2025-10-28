/**
 * Вспомогательные функции
 */

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getRemainingTime(expiresAt) {
  if (!expiresAt) return null;
  const now = Date.now();
  const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
  return remaining;
}

export function createElement(tag, classes = [], content = '') {
  const el = document.createElement(tag);
  if (classes.length) el.className = classes.join(' ');
  if (content) el.textContent = content;
  return el;
}

export function clearContainer(container) {
  if (typeof container === 'string') {
    container = document.getElementById(container);
  }
  if (container) {
    container.innerHTML = '';
  }
}

export function showError(message, type = 'error') {
  const className = type === 'success' ? 'success-message' : 'error-message';
  const errorDiv = createElement('div', [className], message);
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.remove();
  }, 3000);
}

export function showSuccess(message) {
  showError(message, 'success');
}

export function getElement(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`Element not found: ${id}`);
  }
  return el;
}
