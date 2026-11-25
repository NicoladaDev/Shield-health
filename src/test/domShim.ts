import { vi } from 'vitest';

type ListenerEntry = {
  listener: (event: ShimEvent) => void;
  capture: boolean;
};

export class ShimEvent {
  readonly type: string;
  readonly bubbles: boolean;
  readonly cancelable: boolean;
  defaultPrevented = false;
  target: ShimEventTarget | null = null;
  currentTarget: ShimEventTarget | null = null;
  eventPhase = 0;
  _stopPropagation = false;
  _stopImmediatePropagation = false;

  constructor(
    type: string,
    init: { bubbles?: boolean; cancelable?: boolean } = {}
  ) {
    this.type = type;
    this.bubbles = Boolean(init.bubbles);
    this.cancelable = Boolean(init.cancelable);
  }

  preventDefault(): void {
    if (this.cancelable) {
      this.defaultPrevented = true;
    }
  }

  stopPropagation(): void {
    this._stopPropagation = true;
  }

  stopImmediatePropagation(): void {
    this._stopPropagation = true;
    this._stopImmediatePropagation = true;
  }
}

export class ShimMouseEvent extends ShimEvent {
  readonly button: number;
  readonly buttons: number;
  readonly relatedTarget: ShimEventTarget | null;
  readonly clientX: number;
  readonly clientY: number;

  constructor(
    type: string,
    init: {
      bubbles?: boolean;
      cancelable?: boolean;
      button?: number;
      buttons?: number;
      relatedTarget?: ShimEventTarget | null;
      clientX?: number;
      clientY?: number;
    } = {}
  ) {
    super(type, init);
    this.button = init.button ?? 0;
    this.buttons = init.buttons ?? 0;
    this.relatedTarget = init.relatedTarget ?? null;
    this.clientX = init.clientX ?? 0;
    this.clientY = init.clientY ?? 0;
  }
}

export class ShimKeyboardEvent extends ShimEvent {
  readonly key: string;
  readonly code: string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;

  constructor(
    type: string,
    init: {
      bubbles?: boolean;
      cancelable?: boolean;
      key?: string;
      code?: string;
      shiftKey?: boolean;
      ctrlKey?: boolean;
      altKey?: boolean;
      metaKey?: boolean;
    } = {}
  ) {
    super(type, init);
    this.key = init.key ?? '';
    this.code = init.code ?? '';
    this.shiftKey = Boolean(init.shiftKey);
    this.ctrlKey = Boolean(init.ctrlKey);
    this.altKey = Boolean(init.altKey);
    this.metaKey = Boolean(init.metaKey);
  }
}

export class ShimEventTarget {
  private _listeners = new Map<string, ListenerEntry[]>();

  addEventListener(
    type: string,
    listener: ((event: ShimEvent) => void) | { handleEvent: (event: ShimEvent) => void } | null,
    options?: boolean | { capture?: boolean }
  ): void {
    if (!listener) return;
    const capture =
      typeof options === 'boolean' ? options : Boolean(options?.capture);
    const fn =
      typeof listener === 'function'
        ? listener
        : (ev: ShimEvent) => listener.handleEvent(ev);
    const list = this._listeners.get(type) ?? [];
    const exists = list.some(
      (item) => item.listener === fn && item.capture === capture
    );
    if (!exists) {
      list.push({ listener: fn, capture });
      this._listeners.set(type, list);
    }
  }

  removeEventListener(
    type: string,
    listener: ((event: ShimEvent) => void) | { handleEvent: (event: ShimEvent) => void } | null,
    options?: boolean | { capture?: boolean }
  ): void {
    if (!listener) return;
    const capture =
      typeof options === 'boolean' ? options : Boolean(options?.capture);
    const list = this._listeners.get(type);
    if (!list) return;
    const next = list.filter(
      (item) => !(item.listener === listener && item.capture === capture)
    );
    if (next.length === 0) {
      this._listeners.delete(type);
    } else {
      this._listeners.set(type, next);
    }
  }

  _clearListeners(): void {
    this._listeners.clear();
  }

  _invokeListeners(event: ShimEvent, capturePhase: boolean): void {
    const list = this._listeners.get(event.type);
    if (!list || list.length === 0) return;
    const snapshot = [...list];
    for (const entry of snapshot) {
      if (entry.capture !== capturePhase) continue;
      if (event._stopImmediatePropagation) break;
      entry.listener.call(this, event);
    }
  }

  dispatchEvent(event: ShimEvent): boolean {
    event.target = this;
    const path: ShimEventTarget[] = [];
    if (this instanceof ShimNode) {
      let cur: ShimNode | null = this.parentNode;
      while (cur) {
        path.unshift(cur);
        cur = cur.parentNode;
      }
      if (this.ownerDocument && path[0] !== this.ownerDocument && (this as ShimNode) !== this.ownerDocument) {
        // Detached subtrees do not bubble to document unless connected
      }
      if (path[0] instanceof ShimDocument && path[0].defaultView) {
        path.unshift(path[0].defaultView);
      }
    }

    event.eventPhase = 1;
    for (const ancestor of path) {
      if (event._stopPropagation) break;
      event.currentTarget = ancestor;
      ancestor._invokeListeners(event, true);
    }

    if (!event._stopPropagation) {
      event.eventPhase = 2;
      event.currentTarget = this;
      this._invokeListeners(event, true);
      if (!event._stopImmediatePropagation) {
        this._invokeListeners(event, false);
      }
    }

    if (event.bubbles && !event._stopPropagation) {
      event.eventPhase = 3;
      for (let i = path.length - 1; i >= 0; i -= 1) {
        if (event._stopPropagation) break;
        const ancestor = path[i];
        event.currentTarget = ancestor;
        ancestor._invokeListeners(event, false);
      }
    }

    event.eventPhase = 0;
    event.currentTarget = null;
    return !event.defaultPrevented;
  }
}

export class ShimNode extends ShimEventTarget {
  static readonly ELEMENT_NODE = 1;
  static readonly TEXT_NODE = 3;
  static readonly COMMENT_NODE = 8;
  static readonly DOCUMENT_NODE = 9;
  static readonly DOCUMENT_FRAGMENT_NODE = 11;

  readonly nodeType: number;
  readonly nodeName: string;
  ownerDocument: ShimDocument | null;
  parentNode: ShimNode | null = null;
  readonly childNodes: ShimNode[] = [];

  constructor(
    nodeType: number,
    nodeName: string,
    ownerDocument: ShimDocument | null
  ) {
    super();
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.ownerDocument = ownerDocument;
  }

  get parentElement(): ShimElement | null {
    return this.parentNode instanceof ShimElement ? this.parentNode : null;
  }

  get firstChild(): ShimNode | null {
    return this.childNodes[0] ?? null;
  }

  get lastChild(): ShimNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }

  get nextSibling(): ShimNode | null {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    if (idx === -1) return null;
    return this.parentNode.childNodes[idx + 1] ?? null;
  }

  get previousSibling(): ShimNode | null {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    if (idx <= 0) return null;
    return this.parentNode.childNodes[idx - 1] ?? null;
  }

  get isConnected(): boolean {
    let cur: ShimNode | null = this;
    while (cur) {
      if (cur.nodeType === ShimNode.DOCUMENT_NODE) return true;
      cur = cur.parentNode;
    }
    return false;
  }

  get nodeValue(): string | null {
    return null;
  }

  set nodeValue(_val: string | null) {
    // Overridden by character data subclasses
  }

  get textContent(): string | null {
    return this.childNodes
      .filter((c) => c.nodeType !== ShimNode.COMMENT_NODE)
      .map((c) => c.textContent ?? '')
      .join('');
  }

  set textContent(value: string | null) {
    const doc = this.ownerDocument;
    while (this.childNodes.length > 0) {
      const last = this.childNodes[this.childNodes.length - 1];
      this.removeChild(last);
    }
    const text = value === null ? '' : String(value);
    if (text.length > 0) {
      this.appendChild(new ShimText(text, doc));
    }
  }

  contains(other: unknown): boolean {
    if (!(other instanceof ShimNode)) return false;
    let cur: ShimNode | null = other;
    while (cur) {
      if (cur === this) return true;
      cur = cur.parentNode;
    }
    return false;
  }

  appendChild<T extends ShimNode>(child: T): T {
    return this.insertBefore(child, null);
  }

  insertBefore<T extends ShimNode>(child: T, refNode: ShimNode | null): T {
    if (child.nodeType === ShimNode.DOCUMENT_FRAGMENT_NODE) {
      const children = [...child.childNodes];
      for (const item of children) {
        this.insertBefore(item, refNode);
      }
      return child;
    }

    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }

    child.parentNode = this;
    if (refNode && refNode.parentNode === this) {
      const idx = this.childNodes.indexOf(refNode);
      this.childNodes.splice(idx, 0, child);
    } else {
      this.childNodes.push(child);
    }

    if (this instanceof ShimHTMLSelectElement && child instanceof ShimHTMLOptionElement) {
      this._syncPendingSelection(child);
    }

    return child;
  }

  removeChild<T extends ShimNode>(child: T): T {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) {
      this.childNodes.splice(idx, 1);
      child.parentNode = null;
      const doc = this.ownerDocument ?? (this instanceof ShimDocument ? this : null);
      if (doc && doc._rawActiveElement && child.contains(doc._rawActiveElement)) {
        doc._rawActiveElement = doc.body;
      }
    }
    return child;
  }

  replaceChild<T extends ShimNode>(newChild: ShimNode, oldChild: T): T {
    this.insertBefore(newChild, oldChild);
    return this.removeChild(oldChild);
  }
}

export class ShimText extends ShimNode {
  private _data: string;

  constructor(data: string, ownerDocument: ShimDocument | null) {
    super(ShimNode.TEXT_NODE, '#text', ownerDocument);
    this._data = data;
  }

  get data(): string {
    return this._data;
  }

  set data(value: string) {
    this._data = String(value);
  }

  override get nodeValue(): string {
    return this._data;
  }

  override set nodeValue(value: string | null) {
    this._data = value === null ? '' : String(value);
  }

  override get textContent(): string {
    return this._data;
  }

  override set textContent(value: string | null) {
    this._data = value === null ? '' : String(value);
  }
}

export class ShimComment extends ShimNode {
  private _data: string;

  constructor(data: string, ownerDocument: ShimDocument | null) {
    super(ShimNode.COMMENT_NODE, '#comment', ownerDocument);
    this._data = data;
  }

  get data(): string {
    return this._data;
  }

  set data(value: string) {
    this._data = String(value);
  }

  override get nodeValue(): string {
    return this._data;
  }

  override set nodeValue(value: string | null) {
    this._data = value === null ? '' : String(value);
  }

  override get textContent(): string {
    return this._data;
  }

  override set textContent(value: string | null) {
    this._data = value === null ? '' : String(value);
  }
}

export class ShimDocumentFragment extends ShimNode {
  constructor(ownerDocument: ShimDocument | null) {
    super(ShimNode.DOCUMENT_FRAGMENT_NODE, '#document-fragment', ownerDocument);
  }

  get children(): ShimElement[] {
    return this.childNodes.filter(
      (child): child is ShimElement => child instanceof ShimElement
    );
  }
}

function splitTopLevel(input: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = '';
  let bracketDepth = 0;
  let parenDepth = 0;
  let quote: string | null = null;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '[') bracketDepth += 1;
    else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    else if (ch === '(') parenDepth += 1;
    else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);

    if (ch === delimiter && bracketDepth === 0 && parenDepth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function tokenizeSimpleParts(compound: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < compound.length) {
    const ch = compound[i];
    if (ch === '#') {
      let j = i + 1;
      while (j < compound.length && !/[#.[:\s]/.test(compound[j])) j += 1;
      tokens.push(compound.slice(i, j));
      i = j;
    } else if (ch === '.') {
      let j = i + 1;
      while (j < compound.length && !/[#.[:\s]/.test(compound[j])) j += 1;
      tokens.push(compound.slice(i, j));
      i = j;
    } else if (ch === '[') {
      let j = i + 1;
      let q: string | null = null;
      while (j < compound.length) {
        if (q) {
          if (compound[j] === q) q = null;
        } else if (compound[j] === '"' || compound[j] === "'") {
          q = compound[j];
        } else if (compound[j] === ']') {
          j += 1;
          break;
        }
        j += 1;
      }
      tokens.push(compound.slice(i, j));
      i = j;
    } else if (ch === ':') {
      let j = i + 1;
      let depth = 0;
      let q: string | null = null;
      while (j < compound.length) {
        const c = compound[j];
        if (q) {
          if (c === q) q = null;
        } else if (c === '"' || c === "'") {
          q = c;
        } else if (c === '(') {
          depth += 1;
        } else if (c === ')') {
          depth -= 1;
          if (depth === 0) {
            j += 1;
            break;
          }
        } else if (depth === 0 && /[#.[:\s]/.test(c)) {
          break;
        }
        j += 1;
      }
      tokens.push(compound.slice(i, j));
      i = j;
    } else {
      let j = i + 1;
      while (j < compound.length && !/[#.[:\s]/.test(compound[j])) j += 1;
      tokens.push(compound.slice(i, j));
      i = j;
    }
  }
  return tokens;
}

function matchesToken(el: ShimElement, token: string): boolean {
  if (token === '*') return true;
  if (token.startsWith('#')) {
    return el.id === token.slice(1);
  }
  if (token.startsWith('.')) {
    const cls = token.slice(1);
    return el.className.split(/\s+/).includes(cls);
  }
  if (token.startsWith('[') && token.endsWith(']')) {
    const inner = token.slice(1, -1).trim();
    const eqIdx = inner.indexOf('=');
    if (eqIdx === -1) {
      return el.hasAttribute(inner);
    }
    const attrName = inner.slice(0, eqIdx).trim();
    let expected = inner.slice(eqIdx + 1).trim();
    if (
      (expected.startsWith('"') && expected.endsWith('"')) ||
      (expected.startsWith("'") && expected.endsWith("'"))
    ) {
      expected = expected.slice(1, -1);
    }
    if (attrName.toLowerCase() === 'type' && el instanceof ShimHTMLInputElement) {
      return el.type === expected;
    }
    return el.getAttribute(attrName) === expected;
  }
  if (token.startsWith(':not(') && token.endsWith(')')) {
    const inner = token.slice(5, -1).trim();
    return !matchesCompound(el, inner);
  }
  return el.tagName.toLowerCase() === token.toLowerCase();
}

function matchesCompound(el: ShimElement, compound: string): boolean {
  const tokens = tokenizeSimpleParts(compound);
  return tokens.every((t) => matchesToken(el, t));
}

function tokenizeComplexSelector(selector: string): Array<{ combinator: ' ' | '>'; part: string }> {
  const result: Array<{ combinator: ' ' | '>'; part: string }> = [];
  let i = 0;
  let nextCombinator: ' ' | '>' = ' ';
  while (i < selector.length) {
    while (i < selector.length && /\s/.test(selector[i])) i += 1;
    if (i >= selector.length) break;
    if (selector[i] === '>') {
      nextCombinator = '>';
      i += 1;
      continue;
    }
    let current = '';
    let bracketDepth = 0;
    let parenDepth = 0;
    let quote: string | null = null;
    while (i < selector.length) {
      const ch = selector[i];
      if (quote) {
        current += ch;
        if (ch === quote) quote = null;
        i += 1;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        current += ch;
        i += 1;
        continue;
      }
      if (ch === '[') bracketDepth += 1;
      else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
      else if (ch === '(') parenDepth += 1;
      else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);

      if (bracketDepth === 0 && parenDepth === 0 && (/\s/.test(ch) || ch === '>')) {
        break;
      }
      current += ch;
      i += 1;
    }
    if (current) {
      result.push({ combinator: nextCombinator, part: current });
      nextCombinator = ' ';
    }
  }
  return result;
}

function matchesComplexSelector(el: ShimElement, selector: string): boolean {
  const segments = tokenizeComplexSelector(selector);
  if (segments.length === 0) return false;
  if (!matchesCompound(el, segments[segments.length - 1].part)) return false;
  let current: ShimElement | null = el;
  for (let i = segments.length - 2; i >= 0; i -= 1) {
    const combinator = segments[i + 1].combinator;
    const part = segments[i].part;
    if (combinator === '>') {
      current = current?.parentElement ?? null;
      if (!current || !matchesCompound(current, part)) return false;
    } else {
      let ancestor: ShimElement | null = current?.parentElement ?? null;
      while (ancestor && !matchesCompound(ancestor, part)) {
        ancestor = ancestor.parentElement;
      }
      if (!ancestor) return false;
      current = ancestor;
    }
  }
  return true;
}

export class ShimElement extends ShimNode {
  readonly tagName: string;
  readonly namespaceURI: string;
  readonly attributes = new Map<string, string>();
  readonly style: Record<string, string> = {};
  declare scrollIntoView: ReturnType<typeof vi.fn>;

  constructor(
    tagName: string,
    ownerDocument: ShimDocument | null,
    namespaceURI = 'http://www.w3.org/1999/xhtml'
  ) {
    const normalizedName =
      namespaceURI === 'http://www.w3.org/1999/xhtml'
        ? tagName.toUpperCase()
        : tagName;
    super(ShimNode.ELEMENT_NODE, normalizedName, ownerDocument);
    this.tagName = normalizedName;
    this.namespaceURI = namespaceURI;
  }

  get id(): string {
    return this.getAttribute('id') ?? '';
  }

  set id(value: string) {
    this.setAttribute('id', value);
  }

  get className(): string {
    return this.getAttribute('class') ?? '';
  }

  set className(value: string) {
    this.setAttribute('class', value);
  }

  get classList() {
    const getClasses = () =>
      this.className.split(/\s+/).filter(Boolean);
    return {
      add: (...tokens: string[]) => {
        const set = new Set(getClasses());
        for (const t of tokens) set.add(t);
        this.className = Array.from(set).join(' ');
      },
      remove: (...tokens: string[]) => {
        const removeSet = new Set(tokens);
        this.className = getClasses()
          .filter((c) => !removeSet.has(c))
          .join(' ');
      },
      contains: (token: string) => getClasses().includes(token),
      toggle: (token: string) => {
        if (getClasses().includes(token)) {
          const next = getClasses().filter((c) => c !== token);
          this.className = next.join(' ');
          return false;
        }
        const next = [...getClasses(), token];
        this.className = next.join(' ');
        return true;
      },
    };
  }

  setAttribute(name: string, value: string): void {
    const key =
      this.namespaceURI === 'http://www.w3.org/1999/xhtml'
        ? name.toLowerCase()
        : name;
    this.attributes.set(key, String(value));
  }

  setAttributeNS(_ns: string | null, name: string, value: string): void {
    this.setAttribute(name, value);
  }

  getAttribute(name: string): string | null {
    const key =
      this.namespaceURI === 'http://www.w3.org/1999/xhtml'
        ? name.toLowerCase()
        : name;
    return this.attributes.get(key) ?? null;
  }

  hasAttribute(name: string): boolean {
    const key =
      this.namespaceURI === 'http://www.w3.org/1999/xhtml'
        ? name.toLowerCase()
        : name;
    return this.attributes.has(key);
  }

  removeAttribute(name: string): void {
    const key =
      this.namespaceURI === 'http://www.w3.org/1999/xhtml'
        ? name.toLowerCase()
        : name;
    this.attributes.delete(key);
  }

  hasAttributes(): boolean {
    return this.attributes.size > 0;
  }

  getAttributeNames(): string[] {
    return Array.from(this.attributes.keys());
  }

  get children(): ShimElement[] {
    return this.childNodes.filter(
      (child): child is ShimElement => child instanceof ShimElement
    );
  }

  matches(selector: string): boolean {
    const groups = splitTopLevel(selector, ',');
    return groups.some((g) => matchesComplexSelector(this, g));
  }

  closest(selector: string): ShimElement | null {
    let cur: ShimElement | null = this;
    while (cur) {
      if (cur.matches(selector)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  querySelectorAll(selector: string): ShimElement[] {
    const results: ShimElement[] = [];
    const visit = (node: ShimNode) => {
      for (const child of node.childNodes) {
        if (child instanceof ShimElement) {
          if (child.matches(selector)) {
            results.push(child);
          }
          visit(child);
        }
      }
    };
    visit(this);
    return results;
  }

  querySelector(selector: string): ShimElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  getElementsByTagName(tagName: string): ShimElement[] {
    const target = tagName.toLowerCase();
    const results: ShimElement[] = [];
    const visit = (node: ShimNode) => {
      for (const child of node.childNodes) {
        if (child instanceof ShimElement) {
          if (target === '*' || child.tagName.toLowerCase() === target) {
            results.push(child);
          }
          visit(child);
        }
      }
    };
    visit(this);
    return results;
  }

  getBoundingClientRect() {
    return {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
  }
}

ShimElement.prototype.scrollIntoView = vi.fn();

export class ShimSVGElement extends ShimElement {
  constructor(tagName: string, ownerDocument: ShimDocument | null) {
    super(tagName, ownerDocument, 'http://www.w3.org/2000/svg');
  }
}

export class ShimHTMLElement extends ShimElement {
  constructor(tagName: string, ownerDocument: ShimDocument | null) {
    super(tagName, ownerDocument, 'http://www.w3.org/1999/xhtml');
  }

  get tabIndex(): number {
    const attr = this.getAttribute('tabindex');
    if (attr !== null) {
      const parsed = Number(attr);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (
      this instanceof ShimHTMLButtonElement ||
      this instanceof ShimHTMLInputElement ||
      this instanceof ShimHTMLSelectElement ||
      this instanceof ShimHTMLTextAreaElement ||
      (this instanceof ShimHTMLAnchorElement && this.hasAttribute('href'))
    ) {
      return 0;
    }
    return -1;
  }

  set tabIndex(value: number) {
    this.setAttribute('tabindex', String(value));
  }

  get title(): string {
    return this.getAttribute('title') ?? '';
  }

  set title(value: string) {
    this.setAttribute('title', value);
  }

  get htmlFor(): string {
    return this.getAttribute('for') ?? '';
  }

  set htmlFor(value: string) {
    this.setAttribute('for', value);
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(value: boolean) {
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  get hidden(): boolean {
    return this.hasAttribute('hidden');
  }

  set hidden(value: boolean) {
    if (value) {
      this.setAttribute('hidden', '');
    } else {
      this.removeAttribute('hidden');
    }
  }

  focus(): void {
    if (!this.isConnected || this.disabled) return;
    const doc = this.ownerDocument;
    if (!doc) return;
    const prev = doc._rawActiveElement;
    if (prev === this) return;
    doc._rawActiveElement = this;
    if (prev && prev.isConnected) {
      prev.dispatchEvent(new ShimEvent('focusout', { bubbles: true }));
      prev.dispatchEvent(new ShimEvent('blur', { bubbles: false }));
    }
    this.dispatchEvent(new ShimEvent('focusin', { bubbles: true }));
    this.dispatchEvent(new ShimEvent('focus', { bubbles: false }));
  }

  blur(): void {
    const doc = this.ownerDocument;
    if (!doc || doc._rawActiveElement !== this) return;
    doc._rawActiveElement = doc.body;
    this.dispatchEvent(new ShimEvent('focusout', { bubbles: true }));
    this.dispatchEvent(new ShimEvent('blur', { bubbles: false }));
  }

  click(): void {
    if (this.disabled) return;
    const clickEvent = new ShimMouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    const notCancelled = this.dispatchEvent(clickEvent);
    if (notCancelled && this instanceof ShimHTMLButtonElement) {
      const btnType = (this.getAttribute('type') ?? 'submit').toLowerCase();
      if (btnType === 'submit') {
        const form = this.closest('form');
        if (form instanceof ShimHTMLFormElement) {
          form.dispatchEvent(
            new ShimEvent('submit', { bubbles: true, cancelable: true })
          );
        }
      }
    }
  }
}

export class ShimHTMLAnchorElement extends ShimHTMLElement {
  get href(): string {
    return this.getAttribute('href') ?? '';
  }

  set href(value: string) {
    this.setAttribute('href', value);
  }
}

export class ShimHTMLButtonElement extends ShimHTMLElement {
  get type(): string {
    return this.getAttribute('type') ?? 'submit';
  }

  set type(value: string) {
    this.setAttribute('type', value);
  }

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  set name(value: string) {
    this.setAttribute('name', value);
  }

  get value(): string {
    return this.getAttribute('value') ?? '';
  }

  set value(val: string) {
    this.setAttribute('value', val);
  }
}

export class ShimHTMLFormElement extends ShimHTMLElement {
  get noValidate(): boolean {
    return this.hasAttribute('novalidate');
  }

  set noValidate(value: boolean) {
    if (value) this.setAttribute('novalidate', '');
    else this.removeAttribute('novalidate');
  }

  submit(): void {
    this.dispatchEvent(
      new ShimEvent('submit', { bubbles: true, cancelable: true })
    );
  }
}

export class ShimHTMLLabelElement extends ShimHTMLElement {
  get control(): ShimHTMLElement | null {
    const targetId = this.htmlFor;
    if (targetId && this.ownerDocument) {
      const found = this.ownerDocument.getElementById(targetId);
      return found instanceof ShimHTMLElement ? found : null;
    }
    const nested = this.querySelector('input, select, textarea, button');
    return nested instanceof ShimHTMLElement ? nested : null;
  }
}

export class ShimHTMLIFrameElement extends ShimHTMLElement {
  contentWindow: ShimWindow | null = null;
}

export class ShimHTMLOptionElement extends ShimHTMLElement {
  private _selected = false;

  get selected(): boolean {
    return this._selected;
  }

  set selected(val: boolean) {
    this._selected = Boolean(val);
  }

  get value(): string {
    return this.getAttribute('value') ?? this.textContent ?? '';
  }

  set value(val: string) {
    this.setAttribute('value', String(val));
  }

  get text(): string {
    return this.textContent ?? '';
  }
}

export class ShimHTMLInputElement extends ShimHTMLElement {
  private _value = '';
  private _checked = false;

  get value(): string {
    return this._value;
  }

  set value(val: string) {
    this._value = String(val);
  }

  get defaultValue(): string {
    return this.getAttribute('value') ?? '';
  }

  set defaultValue(val: string) {
    this.setAttribute('value', String(val));
    this._value = String(val);
  }

  get checked(): boolean {
    return this._checked;
  }

  set checked(val: boolean) {
    this._checked = Boolean(val);
  }

  get defaultChecked(): boolean {
    return this.hasAttribute('checked');
  }

  set defaultChecked(val: boolean) {
    if (val) this.setAttribute('checked', '');
    else this.removeAttribute('checked');
    this._checked = Boolean(val);
  }

  get type(): string {
    return this.getAttribute('type') ?? 'text';
  }

  set type(val: string) {
    this.setAttribute('type', String(val));
  }

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  set name(val: string) {
    this.setAttribute('name', String(val));
  }

  get placeholder(): string {
    return this.getAttribute('placeholder') ?? '';
  }

  set placeholder(val: string) {
    this.setAttribute('placeholder', String(val));
  }

  get maxLength(): number {
    const raw = this.getAttribute('maxlength');
    return raw !== null ? Number(raw) : -1;
  }

  set maxLength(val: number) {
    this.setAttribute('maxlength', String(val));
  }

  get min(): string {
    return this.getAttribute('min') ?? '';
  }

  set min(val: string) {
    this.setAttribute('min', String(val));
  }

  get max(): string {
    return this.getAttribute('max') ?? '';
  }

  set max(val: string) {
    this.setAttribute('max', String(val));
  }

  get step(): string {
    return this.getAttribute('step') ?? '';
  }

  set step(val: string) {
    this.setAttribute('step', String(val));
  }

  get readOnly(): boolean {
    return this.hasAttribute('readonly');
  }

  set readOnly(val: boolean) {
    if (val) this.setAttribute('readonly', '');
    else this.removeAttribute('readonly');
  }

  get required(): boolean {
    return this.hasAttribute('required');
  }

  set required(val: boolean) {
    if (val) this.setAttribute('required', '');
    else this.removeAttribute('required');
  }
}

export class ShimHTMLTextAreaElement extends ShimHTMLElement {
  private _value = '';

  get value(): string {
    return this._value;
  }

  set value(val: string) {
    this._value = String(val);
  }

  get defaultValue(): string {
    return this.textContent ?? '';
  }

  set defaultValue(val: string) {
    this.textContent = String(val);
    this._value = String(val);
  }

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  set name(val: string) {
    this.setAttribute('name', String(val));
  }

  get placeholder(): string {
    return this.getAttribute('placeholder') ?? '';
  }

  set placeholder(val: string) {
    this.setAttribute('placeholder', String(val));
  }

  get maxLength(): number {
    const raw = this.getAttribute('maxlength');
    return raw !== null ? Number(raw) : -1;
  }

  set maxLength(val: number) {
    this.setAttribute('maxlength', String(val));
  }

  get rows(): number {
    const raw = this.getAttribute('rows');
    return raw !== null ? Number(raw) : 2;
  }

  set rows(val: number) {
    this.setAttribute('rows', String(val));
  }

  get readOnly(): boolean {
    return this.hasAttribute('readonly');
  }

  set readOnly(val: boolean) {
    if (val) this.setAttribute('readonly', '');
    else this.removeAttribute('readonly');
  }
}

export class ShimHTMLSelectElement extends ShimHTMLElement {
  private _pendingValue: string | null = null;

  get options(): ShimHTMLOptionElement[] {
    return this.querySelectorAll('option').filter(
      (el): el is ShimHTMLOptionElement => el instanceof ShimHTMLOptionElement
    );
  }

  get selectedIndex(): number {
    const opts = this.options;
    if (opts.length === 0) return -1;
    const idx = opts.findIndex((o) => o.selected);
    return idx >= 0 ? idx : 0;
  }

  get value(): string {
    const opts = this.options;
    const idx = this.selectedIndex;
    if (idx >= 0 && opts[idx]) {
      return opts[idx].value;
    }
    return this._pendingValue ?? '';
  }

  set value(val: string) {
    const str = String(val);
    this._pendingValue = str;
    for (const opt of this.options) {
      opt.selected = opt.value === str;
    }
  }

  _syncPendingSelection(opt: ShimHTMLOptionElement): void {
    if (this._pendingValue !== null) {
      opt.selected = opt.value === this._pendingValue;
    }
  }
}

export class ShimStorage {
  private _store = new Map<string, string>();

  get length(): number {
    return this._store.size;
  }

  clear(): void {
    this._store.clear();
  }

  getItem(key: string): string | null {
    const value = this._store.get(String(key));
    return value === undefined ? null : value;
  }

  key(index: number): string | null {
    const keys = Array.from(this._store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this._store.delete(String(key));
  }

  setItem(key: string, value: string): void {
    this._store.set(String(key), String(value));
  }
}

export class ShimDocument extends ShimNode {
  oninput: ((ev: ShimEvent) => void) | null = null;
  onchange: ((ev: ShimEvent) => void) | null = null;
  onclick: ((ev: ShimEvent) => void) | null = null;
  onkeydown: ((ev: ShimEvent) => void) | null = null;
  defaultView: ShimWindow;
  readonly documentElement: ShimHTMLElement;
  readonly head: ShimHTMLElement;
  readonly body: ShimHTMLElement;
  _rawActiveElement: ShimElement | null = null;

  constructor(defaultView: ShimWindow) {
    super(ShimNode.DOCUMENT_NODE, '#document', null);
    this.ownerDocument = this;
    this.defaultView = defaultView;
    this.documentElement = new ShimHTMLElement('html', this);
    this.head = new ShimHTMLElement('head', this);
    this.body = new ShimHTMLElement('body', this);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.appendChild(this.documentElement);
    this._rawActiveElement = this.body;
  }

  get activeElement(): ShimElement | null {
    if (this._rawActiveElement && this._rawActiveElement.isConnected) {
      return this._rawActiveElement;
    }
    return this.body;
  }

  set activeElement(el: ShimElement | null) {
    this._rawActiveElement = el ?? this.body;
  }

  createElement(tagName: string): ShimHTMLElement {
    const lower = tagName.toLowerCase();
    switch (lower) {
      case 'a':
        return new ShimHTMLAnchorElement(lower, this);
      case 'button':
        return new ShimHTMLButtonElement(lower, this);
      case 'form':
        return new ShimHTMLFormElement(lower, this);
      case 'input':
        return new ShimHTMLInputElement(lower, this);
      case 'label':
        return new ShimHTMLLabelElement(lower, this);
      case 'option':
        return new ShimHTMLOptionElement(lower, this);
      case 'select':
        return new ShimHTMLSelectElement(lower, this);
      case 'textarea':
        return new ShimHTMLTextAreaElement(lower, this);
      default:
        return new ShimHTMLElement(lower, this);
    }
  }

  createElementNS(namespaceURI: string, qualifiedName: string): ShimElement {
    if (namespaceURI === 'http://www.w3.org/2000/svg') {
      return new ShimSVGElement(qualifiedName, this);
    }
    return this.createElement(qualifiedName);
  }

  createTextNode(data: string): ShimText {
    return new ShimText(String(data), this);
  }

  createComment(data: string): ShimComment {
    return new ShimComment(String(data), this);
  }

  createDocumentFragment(): ShimDocumentFragment {
    return new ShimDocumentFragment(this);
  }

  querySelectorAll(selector: string): ShimElement[] {
    return this.documentElement.querySelectorAll(selector);
  }

  querySelector(selector: string): ShimElement | null {
    return this.documentElement.querySelector(selector);
  }

  getElementById(id: string): ShimElement | null {
    const visit = (node: ShimNode): ShimElement | null => {
      for (const child of node.childNodes) {
        if (child instanceof ShimElement) {
          if (child.id === id) return child;
          const found = visit(child);
          if (found) return found;
        }
      }
      return null;
    };
    return visit(this.documentElement);
  }
}

export class ShimWindow extends ShimEventTarget {
  document: ShimDocument;
  localStorage = new ShimStorage();
  innerWidth = 1280;
  location = {
    reload: vi.fn(),
  };
  print = vi.fn();
  scrollTo = vi.fn();

  setTimeout = (
    handler: (...args: unknown[]) => void,
    timeout?: number,
    ...args: unknown[]
  ) => globalThis.setTimeout(handler, timeout, ...args);

  clearTimeout = (id?: ReturnType<typeof globalThis.setTimeout>) => {
    globalThis.clearTimeout(id);
  };

  setInterval = (
    handler: (...args: unknown[]) => void,
    timeout?: number,
    ...args: unknown[]
  ) => globalThis.setInterval(handler, timeout, ...args);

  clearInterval = (id?: ReturnType<typeof globalThis.setInterval>) => {
    globalThis.clearInterval(id);
  };

  requestAnimationFrame = (cb: (ts: number) => void) =>
    globalThis.setTimeout(() => cb(Date.now()), 0);

  cancelAnimationFrame = (id: ReturnType<typeof globalThis.setTimeout>) => {
    globalThis.clearTimeout(id);
  };

  readonly Node = ShimNode;
  readonly Element = ShimElement;
  readonly HTMLElement = ShimHTMLElement;
  readonly SVGElement = ShimSVGElement;
  readonly HTMLInputElement = ShimHTMLInputElement;
  readonly HTMLTextAreaElement = ShimHTMLTextAreaElement;
  readonly HTMLSelectElement = ShimHTMLSelectElement;
  readonly HTMLOptionElement = ShimHTMLOptionElement;
  readonly HTMLButtonElement = ShimHTMLButtonElement;
  readonly HTMLFormElement = ShimHTMLFormElement;
  readonly HTMLAnchorElement = ShimHTMLAnchorElement;
  readonly HTMLLabelElement = ShimHTMLLabelElement;
  readonly HTMLIFrameElement = ShimHTMLIFrameElement;
  readonly Text = ShimText;
  readonly Comment = ShimComment;
  readonly DocumentFragment = ShimDocumentFragment;
  readonly Document = ShimDocument;
  readonly Event = ShimEvent;
  readonly MouseEvent = ShimMouseEvent;
  readonly KeyboardEvent = ShimKeyboardEvent;

  constructor() {
    super();
    this.document = new ShimDocument(this);
  }
}

const g = globalThis as unknown as Record<string, unknown>;

let shimWindow: ShimWindow | null = null;

export function installDomShim(): ShimWindow {
  if (shimWindow) return shimWindow;
  const win = new ShimWindow();
  shimWindow = win;

  g.IS_REACT_ACT_ENVIRONMENT = true;
  g.window = win;
  g.document = win.document;
  g.localStorage = win.localStorage;
  g.Node = ShimNode;
  g.Element = ShimElement;
  g.HTMLElement = ShimHTMLElement;
  g.SVGElement = ShimSVGElement;
  g.HTMLInputElement = ShimHTMLInputElement;
  g.HTMLTextAreaElement = ShimHTMLTextAreaElement;
  g.HTMLSelectElement = ShimHTMLSelectElement;
  g.HTMLOptionElement = ShimHTMLOptionElement;
  g.HTMLButtonElement = ShimHTMLButtonElement;
  g.HTMLFormElement = ShimHTMLFormElement;
  g.HTMLAnchorElement = ShimHTMLAnchorElement;
  g.HTMLLabelElement = ShimHTMLLabelElement;
  g.HTMLIFrameElement = ShimHTMLIFrameElement;
  g.Text = ShimText;
  g.Comment = ShimComment;
  g.DocumentFragment = ShimDocumentFragment;
  g.Document = ShimDocument;
  g.Event = ShimEvent;
  g.MouseEvent = ShimMouseEvent;
  g.KeyboardEvent = ShimKeyboardEvent;

  if (typeof globalThis.navigator !== 'undefined') {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  } else {
    g.navigator = {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    };
  }

  return win;
}

const beforeResetHooks = new Set<() => Promise<void> | void>();

export function registerBeforeResetHook(hook: () => Promise<void> | void): void {
  beforeResetHooks.add(hook);
}

export async function runBeforeResetHooks(): Promise<void> {
  for (const hook of Array.from(beforeResetHooks)) {
    await hook();
  }
}

export function resetDomShim(): void {
  const win = installDomShim();
  const doc = win.document;
  while (doc.body.childNodes.length > 0) {
    doc.body.removeChild(doc.body.childNodes[0]);
  }
  for (const key of Object.keys(doc.body.style)) {
    delete doc.body.style[key];
  }
  doc._rawActiveElement = doc.body;
  doc._clearListeners();
  win._clearListeners();

  win.localStorage = new ShimStorage();
  g.localStorage = win.localStorage;
  win.innerWidth = 1280;
  win.location.reload = vi.fn();
  win.print = vi.fn();
  win.scrollTo = vi.fn();
  ShimElement.prototype.scrollIntoView = vi.fn();

  if (typeof globalThis.navigator !== 'undefined') {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  }
}

installDomShim();
