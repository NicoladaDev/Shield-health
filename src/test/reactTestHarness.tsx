import './domShim';
import { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { vi } from 'vitest';
import {
  registerBeforeResetHook,
  ShimElement,
  ShimHTMLElement,
  ShimHTMLInputElement,
  ShimHTMLSelectElement,
  ShimHTMLTextAreaElement,
  ShimKeyboardEvent,
  ShimMouseEvent,
  ShimEvent,
} from './domShim';

export interface MountedApp {
  container: HTMLElement;
  rerender: (nextUi: ReactNode) => Promise<void>;
  unmount: () => Promise<void>;
}

const activeRoots = new Set<() => Promise<void>>();

export async function mountStrict(ui: ReactNode): Promise<MountedApp> {
  const container = document.createElement('div');
  container.id = 'root';
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<StrictMode>{ui}</StrictMode>);
  });

  let unmounted = false;
  const unmount = async () => {
    if (unmounted) return;
    unmounted = true;
    activeRoots.delete(unmount);
    await act(async () => {
      root.unmount();
    });
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  };

  activeRoots.add(unmount);

  return {
    container: container as unknown as HTMLElement,
    rerender: async (nextUi: ReactNode) => {
      await act(async () => {
        root.render(<StrictMode>{nextUi}</StrictMode>);
      });
    },
    unmount,
  };
}

export async function unmountAllRoots(): Promise<void> {
  for (const unmount of Array.from(activeRoots)) {
    await unmount();
  }
}

registerBeforeResetHook(unmountAllRoots);

export function renderStatic(ui: ReactNode): string {
  return renderToStaticMarkup(ui);
}

function normalizeText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

function matchesMatcher(text: string, matcher: string | RegExp): boolean {
  if (typeof matcher === 'string') {
    return text.includes(matcher);
  }
  return matcher.test(text);
}

function getAccessibleName(el: ShimElement): string {
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return normalizeText(ariaLabel);

  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy && el.ownerDocument) {
    const labelParts = labelledBy
      .split(/\s+/)
      .map((id) => el.ownerDocument?.getElementById(id)?.textContent)
      .filter(Boolean);
    if (labelParts.length > 0) return normalizeText(labelParts.join(' '));
  }

  return normalizeText(el.textContent);
}

function getElementRole(el: ShimElement): string | null {
  const explicit = el.getAttribute('role');
  if (explicit) return explicit;
  const tag = el.tagName.toLowerCase();
  if (tag === 'button') return 'button';
  if (tag === 'a' && el.hasAttribute('href')) return 'link';
  if (tag === 'select') return 'combobox';
  if (tag === 'textarea') return 'textbox';
  if (tag === 'input') {
    const type = (el.getAttribute('type') ?? 'text').toLowerCase();
    if (type === 'checkbox') return 'checkbox';
    if (type === 'range') return 'slider';
    if (type === 'button' || type === 'submit') return 'button';
    return 'textbox';
  }
  if (/^h[1-6]$/.test(tag)) return 'heading';
  return null;
}

export function getAllByRole(
  container: HTMLElement | ShimElement,
  role: string,
  options?: { name?: string | RegExp }
): HTMLElement[] {
  const root = container as unknown as ShimElement;
  const all = root.querySelectorAll('*');
  const matches = all.filter((el) => {
    if (getElementRole(el) !== role) return false;
    if (options?.name !== undefined) {
      return matchesMatcher(getAccessibleName(el), options.name);
    }
    return true;
  });
  return matches as unknown as HTMLElement[];
}

export function queryByRole(
  container: HTMLElement | ShimElement,
  role: string,
  options?: { name?: string | RegExp }
): HTMLElement | null {
  return getAllByRole(container, role, options)[0] ?? null;
}

export function getByRole(
  container: HTMLElement | ShimElement,
  role: string,
  options?: { name?: string | RegExp }
): HTMLElement {
  const found = getAllByRole(container, role, options);
  if (found.length === 0) {
    throw new Error(
      `Unable to find role="${role}"${options?.name ? ` with name ${String(options.name)}` : ''}`
    );
  }
  return found[0];
}

export function getAllByText(
  container: HTMLElement | ShimElement,
  matcher: string | RegExp
): HTMLElement[] {
  const root = container as unknown as ShimElement;
  const all = root.querySelectorAll('*');
  const matching = all.filter((el) => {
    const ownText = normalizeText(el.textContent);
    if (!matchesMatcher(ownText, matcher)) return false;
    const childMatches = el.childNodes.some(
      (child) =>
        child instanceof ShimElement &&
        matchesMatcher(normalizeText(child.textContent), matcher)
    );
    return !childMatches;
  });
  return matching as unknown as HTMLElement[];
}

export function queryByText(
  container: HTMLElement | ShimElement,
  matcher: string | RegExp
): HTMLElement | null {
  return getAllByText(container, matcher)[0] ?? null;
}

export function getByText(
  container: HTMLElement | ShimElement,
  matcher: string | RegExp
): HTMLElement {
  const found = getAllByText(container, matcher);
  if (found.length === 0) {
    throw new Error(`Unable to find text matching ${String(matcher)}`);
  }
  return found[0];
}

export function getByLabelText(
  container: HTMLElement | ShimElement,
  matcher: string | RegExp
): HTMLElement {
  const root = container as unknown as ShimElement;
  const labels = root.querySelectorAll('label');
  for (const label of labels) {
    if (matchesMatcher(normalizeText(label.textContent), matcher)) {
      const forId = label.getAttribute('for');
      if (forId && label.ownerDocument) {
        const target = label.ownerDocument.getElementById(forId);
        if (target) return target as unknown as HTMLElement;
      }
      const nested = label.querySelector('input, select, textarea');
      if (nested) return nested as unknown as HTMLElement;
    }
  }
  const byAria = root.querySelectorAll('input, select, textarea').find((el) => {
    const aria = el.getAttribute('aria-label');
    return aria ? matchesMatcher(normalizeText(aria), matcher) : false;
  });
  if (byAria) return byAria as unknown as HTMLElement;
  throw new Error(`Unable to find label matching ${String(matcher)}`);
}

export function getByPlaceholderText(
  container: HTMLElement | ShimElement,
  matcher: string | RegExp
): HTMLElement {
  const root = container as unknown as ShimElement;
  const match = root.querySelectorAll('input, textarea').find((el) => {
    const placeholder = el.getAttribute('placeholder');
    return placeholder ? matchesMatcher(placeholder, matcher) : false;
  });
  if (!match) {
    throw new Error(`Unable to find placeholder matching ${String(matcher)}`);
  }
  return match as unknown as HTMLElement;
}

export async function click(element: HTMLElement): Promise<void> {
  const el = element as unknown as ShimHTMLElement;
  if (el.disabled) return;
  await act(async () => {
    el.focus();
    el.click();
  });
}

export async function pressKey(
  target: HTMLElement | Document,
  key: string,
  options: { shiftKey?: boolean } = {}
): Promise<ShimKeyboardEvent> {
  const ev = new ShimKeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
    shiftKey: options.shiftKey,
  });
  await act(async () => {
    (target as unknown as ShimElement).dispatchEvent(ev);
  });
  return ev;
}

function setNativeValue(el: ShimHTMLElement, value: string): void {
  const proto = Object.getPrototypeOf(el) as object;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  if (desc?.set) {
    desc.set.call(el, value);
  } else if (
    el instanceof ShimHTMLInputElement ||
    el instanceof ShimHTMLTextAreaElement ||
    el instanceof ShimHTMLSelectElement
  ) {
    el.value = value;
  }
}

export async function typeValue(
  element: HTMLElement,
  value: string
): Promise<void> {
  const el = element as unknown as ShimHTMLElement;
  await act(async () => {
    setNativeValue(el, value);
    el.dispatchEvent(new ShimEvent('input', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new ShimEvent('change', { bubbles: true, cancelable: true }));
  });
}

export async function selectOption(
  element: HTMLElement,
  value: string
): Promise<void> {
  const el = element as unknown as ShimHTMLSelectElement;
  await act(async () => {
    const desc = Object.getOwnPropertyDescriptor(
      ShimHTMLSelectElement.prototype,
      'value'
    );
    desc?.set?.call(el, value);
    el.dispatchEvent(new ShimEvent('change', { bubbles: true, cancelable: true }));
  });
}

export async function setRangeValue(
  element: HTMLElement,
  value: number | string
): Promise<void> {
  await typeValue(element, String(value));
}

export async function toggleCheckbox(
  element: HTMLElement,
  checked: boolean
): Promise<void> {
  const el = element as unknown as ShimHTMLInputElement;
  await act(async () => {
    const desc = Object.getOwnPropertyDescriptor(
      ShimHTMLInputElement.prototype,
      'checked'
    );
    desc?.set?.call(el, checked);
    el.dispatchEvent(new ShimMouseEvent('click', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new ShimEvent('change', { bubbles: true, cancelable: true }));
  });
}

export async function hover(element: HTMLElement): Promise<void> {
  const el = element as unknown as ShimHTMLElement;
  await act(async () => {
    el.dispatchEvent(
      new ShimMouseEvent('mouseover', {
        bubbles: true,
        cancelable: true,
        relatedTarget: null,
      })
    );
  });
}

export async function unhover(element: HTMLElement): Promise<void> {
  const el = element as unknown as ShimHTMLElement;
  await act(async () => {
    el.dispatchEvent(
      new ShimMouseEvent('mouseout', {
        bubbles: true,
        cancelable: true,
        relatedTarget: null,
      })
    );
  });
}

export async function focusEl(element: HTMLElement): Promise<void> {
  const el = element as unknown as ShimHTMLElement;
  await act(async () => {
    el.focus();
  });
}

export async function blurEl(element: HTMLElement): Promise<void> {
  const el = element as unknown as ShimHTMLElement;
  await act(async () => {
    el.blur();
  });
}

export function seedStorage(data: unknown): void {
  const raw = typeof data === 'string' ? data : JSON.stringify(data);
  window.localStorage.setItem('shield_health_state_v1', raw);
}

export function mockQuotaExceededOnSetItem(): void {
  vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
    throw new Error('QuotaExceededError');
  });
}

export function mockClipboard(options: {
  reject?: boolean;
  unavailable?: boolean;
} = {}) {
  const writeText = options.reject
    ? vi.fn().mockRejectedValue(new Error('Clipboard denied'))
    : vi.fn().mockResolvedValue(undefined);

  Object.defineProperty(globalThis.navigator, 'clipboard', {
    configurable: true,
    writable: true,
    value: options.unavailable ? undefined : { writeText },
  });

  return writeText;
}
