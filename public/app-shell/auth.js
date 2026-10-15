// public/app-shell/auth.js
// Simulated Bennett Demo Login + 1-Click Persona Switcher

import { store } from './store.js';
import { openModal, closeModal } from '../components/Modal.js';
import { showToast } from '../components/Toast.js';

export const PRESET_PERSONAS = [
  { id: 'E22CSEU0123', name: 'Aarav Sharma', role: 'student', hostel: 'C5', room: '402', tag: 'B.Tech CSE Year 3' },
  { id: 'E23CSEU0412', name: 'Diya Verma', role: 'student', hostel: 'C8', room: '214', tag: 'B.Tech CSE Year 2' },
  { id: 'E24ECEU0108', name: 'Rohan Nair', role: 'student', hostel: 'D2', room: '105', tag: 'B.Tech ECE Year 1' },
  { id: 'STAFF-LAU', name: 'Ramesh Kumar', role: 'staff', service: 'laundry', tag: 'Laundry Ops Supervisor' },
  { id: 'STAFF-LIB', name: 'Dr. Vandana Saxena', role: 'staff', service: 'library', tag: 'Chief Librarian' },
  { id: 'STAFF-GATE', name: 'Balwan Singh', role: 'staff', service: 'parcels', tag: 'Gate 2 Security Lead' }
];

export function openPersonaSwitcher() {
  const currentUser = store.getCurrentUser();

  const content = document.createElement('div');
  content.innerHTML = `
    <div style="margin-bottom: 1.25rem;">
      <span class="bu-badge" style="background: #FEF3C7; color: #92400E; margin-bottom: 0.5rem;">DEMO LOGIN (SIMULATED)</span>
      <p style="font-size: 0.875rem; color: var(--text-muted);">
        Switch active Bennett persona with one click to test multi-user state synchronization, 
        student study passes, and staff check-in consoles in real time.
      </p>
    </div>

    <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem;">
      ${PRESET_PERSONAS.map(p => `
        <button class="bu-persona-btn" data-id="${p.id}" style="
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.75rem 1rem; border: 1px solid ${currentUser?.id === p.id ? 'var(--border-strong)' : 'var(--border-hairline)'};
          background: ${currentUser?.id === p.id ? 'var(--bg-surface)' : 'var(--bg-card)'};
          border-radius: 4px; text-align: left; transition: all 150ms ease;
        ">
          <div>
            <div style="font-weight: 600; font-size: 0.95rem;">${p.name} ${currentUser?.id === p.id ? '<span style="color:var(--accent); font-size:0.8rem; margin-left:0.3rem;">● ACTIVE</span>' : ''}</div>
            <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">${p.id} &bull; ${p.tag}</div>
          </div>
          <span style="font-family: var(--font-mono); font-size: 0.75rem; text-transform: uppercase; background: var(--bg-surface); padding: 0.2rem 0.5rem; border-radius: 3px;">
            ${p.role}
          </span>
        </button>
      `).join('')}
    </div>

    <div style="border-top: 1px solid var(--border-hairline); padding-top: 1.25rem;">
      <h4 style="font-family: var(--font-display); font-size: 1.25rem; margin-bottom: 0.5rem;">Custom Bennett Enrollment ID</h4>
      <div style="display: flex; gap: 0.5rem;">
        <input type="text" id="custom-enroll-id" placeholder="e.g. E22CSEU0551" style="
          flex: 1; padding: 0.5rem 0.75rem; border: 1px solid var(--border-hairline);
          background: #fff; font-family: var(--font-mono); font-size: 0.85rem; border-radius: 4px;
        " />
        <button id="custom-login-btn" class="bu-btn bu-btn-primary bu-btn-sm">Switch Persona</button>
      </div>
      <div id="enroll-error" style="color: var(--accent); font-size: 0.75rem; margin-top: 0.35rem; display: none;">
        Must match format E22CSEU0123 (E followed by 2 digits, 3-4 letters, 4 digits).
      </div>
    </div>
  `;

  content.querySelectorAll('.bu-persona-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pId = btn.dataset.id;
      const target = PRESET_PERSONAS.find(p => p.id === pId);
      if (target) {
        store.setCurrentUser(target);
        showToast(`Switched persona to ${target.name} (${target.id})`, 'info');
        closeModal();
      }
    });
  });

  const customBtn = content.querySelector('#custom-login-btn');
  const customInput = content.querySelector('#custom-enroll-id');
  const errorMsg = content.querySelector('#enroll-error');

  customBtn.addEventListener('click', () => {
    const val = customInput.value.trim().toUpperCase();
    const regex = /^E\d{2}[A-Z]{3,4}\d{4}$/i;
    if (!regex.test(val)) {
      errorMsg.style.display = 'block';
      return;
    }
    errorMsg.style.display = 'none';
    const newPersona = {
      id: val,
      name: `Student (${val})`,
      role: 'student',
      hostel: 'C5',
      room: '304',
      tag: 'Bennett Student'
    };
    store.setCurrentUser(newPersona);
    showToast(`Logged in as ${val}`, 'info');
    closeModal();
  });

  openModal({
    title: 'Select Active Persona',
    content,
    footer: `<button class="bu-btn bu-btn-outline bu-btn-sm" onclick="document.querySelector('.bu-modal-overlay')?.remove()">Cancel</button>`
  });
}
