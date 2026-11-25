import { useEffect, useId, useRef } from 'react';
import type { RefObject } from 'react';

interface UseModalAccessibilityOptions {
  isOpen: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
  );
}

function isElementFocusable(element: HTMLElement | null): element is HTMLElement {
  if (!element || !element.isConnected) return false;
  if (element.hasAttribute('disabled')) return false;
  if ('disabled' in element && Boolean((element as HTMLButtonElement).disabled)) {
    return false;
  }
  return true;
}

export function useModalAccessibility({
  isOpen,
  onClose,
  containerRef,
  initialFocusRef,
  fallbackFocusRef,
}: UseModalAccessibilityOptions): { titleId: string } {
  const titleId = useId();
  const latestOnCloseRef = useRef(onClose);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    latestOnCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const active = document.activeElement;
    previousFocusRef.current =
      active instanceof HTMLElement ? active : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const container = containerRef.current;
    if (container) {
      const target =
        initialFocusRef?.current ??
        getFocusableElements(container)[0] ??
        container;
      target.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        latestOnCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const currentContainer = containerRef.current;
      if (!currentContainer) return;

      const focusables = getFocusableElements(currentContainer);
      if (focusables.length === 0) {
        event.preventDefault();
        currentContainer.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (
          activeElement === first ||
          !currentContainer.contains(activeElement)
        ) {
          event.preventDefault();
          last.focus();
        }
      } else if (
        activeElement === last ||
        !currentContainer.contains(activeElement)
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;

      const prev = previousFocusRef.current;
      if (isElementFocusable(prev)) {
        prev.focus();
      } else if (isElementFocusable(fallbackFocusRef?.current ?? null)) {
        fallbackFocusRef?.current?.focus();
      }
      previousFocusRef.current = null;
    };
  }, [isOpen, containerRef, initialFocusRef, fallbackFocusRef]);

  return { titleId };
}
