/**
 * Modal — overlay dialog with focus trap, Esc close, backdrop click close
 * On mobile renders as bottom-sheet (CSS handles this via media query)
 *
 * Props:
 *   open     boolean
 *   onClose  () => void
 *   title    string
 *   children ReactNode
 */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE =
  'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]';

function trapFocus(dialogEl, e) {
  const focusable = Array.from(dialogEl.querySelectorAll(FOCUSABLE));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

export default function Modal({ open, onClose, title, children }) {
  const dialogRef = useRef(null);
  const openerRef = useRef(null);

  // Remember what had focus before opening
  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement;
      // Move focus into dialog on next tick
      const id = setTimeout(() => {
        if (dialogRef.current) {
          const first = dialogRef.current.querySelector(FOCUSABLE);
          if (first) first.focus();
          else dialogRef.current.focus();
        }
      }, 0);
      return () => clearTimeout(id);
    } else {
      // Return focus to opener when dialog closes
      if (openerRef.current) {
        openerRef.current.focus();
        openerRef.current = null;
      }
    }
  }, [open]);

  // Esc key closes modal
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') trapFocus(dialogRef.current, e);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="ds-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-modal="true"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ds-modal-title"
        className="ds-modal"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="ds-modal__header">
          <h2 id="ds-modal-title" className="ds-modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="ds-modal__close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
