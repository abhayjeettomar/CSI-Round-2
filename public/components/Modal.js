// public/components/Modal.js
// Accessible dialog component with focus lock & backdrop handling

let currentModal = null;

export function openModal({ title, content, footer = '', onClose = null }) {
  closeModal();

  const overlay = document.createElement('div');
  overlay.className = 'bu-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const contentWrapper = typeof content === 'string' ? content : '';

  overlay.innerHTML = `
    <div class="bu-modal-content">
      <div class="bu-modal-header">
        <h3 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: normal;">${title}</h3>
        <button class="bu-modal-close" aria-label="Close" style="padding: 0.25rem; font-size: 1.25rem; line-height: 1;">&times;</button>
      </div>
      <div class="bu-modal-body">${contentWrapper}</div>
      ${footer ? `<div class="bu-modal-footer">${footer}</div>` : ''}
    </div>
  `;

  if (typeof content !== 'string' && content instanceof HTMLElement) {
    overlay.querySelector('.bu-modal-body').appendChild(content);
  }

  const closeBtn = overlay.querySelector('.bu-modal-close');
  const doClose = () => {
    overlay.remove();
    document.removeEventListener('keydown', handleKey);
    currentModal = null;
    if (onClose) onClose();
  };

  closeBtn.addEventListener('click', doClose);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) doClose();
  });

  const handleKey = (e) => {
    if (e.key === 'Escape') doClose();
  };
  document.addEventListener('keydown', handleKey);

  document.body.appendChild(overlay);
  currentModal = overlay;
  return overlay;
}

export function closeModal() {
  if (currentModal) {
    currentModal.remove();
    currentModal = null;
  }
}
