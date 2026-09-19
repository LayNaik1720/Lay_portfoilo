/**
 * Value semantics shared by the query, update and aggregation engines:
 * BSON type ordering, deep equality, and dot-notation path access.
 */
import { ObjectId, Long, Decimal128, Binary } from 'bson';

/** MongoDB's canonical sort order across BSON types. */
export function typeOrder(v) {
  if (v === undefined) return 0;
  if (v === null) return 1;
  if (typeof v === 'number' || v instanceof Long || v instanceof Decimal128) return 2;
  if (typeof v === 'string') return 3;
  if (Array.isArray(v)) return 5;
  if (v instanceof Binary || Buffer.isBuffer(v)) return 6;
  if (v instanceof ObjectId) return 7;
  if (typeof v === 'boolean') return 8;
  if (v instanceof Date) return 9;
  if (v instanceof RegExp) return 11;
  if (typeof v === 'object') return 4;
  return 4;
}

function numeric(v) {
  if (typeof v === 'number') return v;
  if (v instanceof Long) return v.toNumber();
  if (v instanceof Decimal128) return parseFloat(v.toString());
  return NaN;
}

export function isNumeric(v) {
  return typeof v === 'number' || v instanceof Long || v instanceof Decimal128;
}

/** Three-way comparison following MongoDB ordering rules. */
export function compareValues(a, b) {
  const ta = typeOrder(a);
  const tb = typeOrder(b);
  if (ta !== tb) return ta < tb ? -1 : 1;

  switch (ta) {
    case 0:
    case 1:
      return 0;
    case 2: {
      const na = numeric(a);
      const nb = numeric(b);
      if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
      return na === nb ? 0 : na < nb ? -1 : 1;
    }
    case 3:
      return a === b ? 0 : a < b ? -1 : 1;
    case 8:
      return a === b ? 0 : a ? 1 : -1;
    case 9: {
      const da = a.getTime();
      const db = b.getTime();
      return da === db ? 0 : da < db ? -1 : 1;
    }
    case 7:
      return a.toHexString() === b.toHexString() ? 0 : a.toHexString() < b.toHexString() ? -1 : 1;
    case 5: {
      const len = Math.min(a.length, b.length);
      for (let i = 0; i < len; i += 1) {
        const c = compareValues(a[i], b[i]);
        if (c !== 0) return c;
      }
      return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
    }
    case 6: {
      const ba = a instanceof Binary ? a.buffer : a;
      const bb = b instanceof Binary ? b.buffer : b;
      return Buffer.compare(Buffer.from(ba), Buffer.from(bb));
    }
    case 11:
      return String(a) === String(b) ? 0 : String(a) < String(b) ? -1 : 1;
    case 4: {
      const ka = Object.keys(a);
      const kb = Object.keys(b);
      const len = Math.min(ka.length, kb.length);
      for (let i = 0; i < len; i += 1) {
        if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
        const c = compareValues(a[ka[i]], b[kb[i]]);
        if (c !== 0) return c;
      }
      return ka.length === kb.length ? 0 : ka.length < kb.length ? -1 : 1;
    }
    default:
      return 0;
  }
}

export function valuesEqual(a, b) {
  if (a instanceof ObjectId && b instanceof ObjectId) return a.equals(b);
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => valuesEqual(item, b[i]));
  }
  if (isNumeric(a) && isNumeric(b)) return numeric(a) === numeric(b);
  if (a && b && typeof a === 'object' && typeof b === 'object' && !(a instanceof Date) && !(b instanceof Date)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => valuesEqual(a[k], b[k]));
  }
  return a === b;
}

function isPlainContainer(v) {
  return v !== null && typeof v === 'object' && !(v instanceof Date) && !(v instanceof ObjectId)
    && !(v instanceof RegExp) && !(v instanceof Binary) && !(v instanceof Long) && !(v instanceof Decimal128);
}

/**
 * Resolve a dot path, expanding arrays the way MongoDB does.
 * Returns every candidate value the path can address.
 */
export function resolvePath(doc, path) {
  const parts = String(path).split('.');
  let current = [doc];

  for (const part of parts) {
    const next = [];
    for (const node of current) {
      if (node === null || node === undefined) continue;
      if (Array.isArray(node)) {
        const asIndex = Number(part);
        if (Number.isInteger(asIndex) && String(asIndex) === part && asIndex < node.length) {
          next.push(node[asIndex]);
        }
        for (const item of node) {
          if (isPlainContainer(item) && !Array.isArray(item) && part in item) next.push(item[part]);
        }
      } else if (isPlainContainer(node) && part in node) {
        next.push(node[part]);
      }
    }
    current = next;
    if (current.length === 0) return [];
  }
  return current;
}

/** Single-value read used by projections and aggregation expressions. */
export function getPath(doc, path) {
  const parts = String(path).split('.');
  let node = doc;
  for (const part of parts) {
    if (node === null || node === undefined) return undefined;
    if (Array.isArray(node)) {
      const asIndex = Number(part);
      if (Number.isInteger(asIndex) && String(asIndex) === part) {
        node = node[asIndex];
        continue;
      }
      const mapped = node
        .filter((item) => isPlainContainer(item) && !Array.isArray(item))
        .map((item) => item[part])
        .filter((item) => item !== undefined);
      return mapped.length ? mapped : undefined;
    }
    if (!isPlainContainer(node)) return undefined;
    node = node[part];
  }
  return node;
}

export function setPath(doc, path, value) {
  const parts = String(path).split('.');
  let node = doc;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (Array.isArray(node)) {
      const idx = Number(part);
      if (!Number.isInteger(idx)) return;
      if (node[idx] === undefined || !isPlainContainer(node[idx])) node[idx] = {};
      node = node[idx];
      continue;
    }
    if (!isPlainContainer(node[part])) {
      const nextPart = parts[i + 1];
      node[part] = Number.isInteger(Number(nextPart)) && String(Number(nextPart)) === nextPart ? [] : {};
    }
    node = node[part];
  }
  const last = parts[parts.length - 1];
  if (Array.isArray(node)) {
    const idx = Number(last);
    if (Number.isInteger(idx)) node[idx] = value;
    return;
  }
  node[last] = value;
}

export function unsetPath(doc, path) {
  const parts = String(path).split('.');
  let node = doc;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (node === null || node === undefined) return;
    node = Array.isArray(node) ? node[Number(parts[i])] : node[parts[i]];
  }
  if (node === null || node === undefined || typeof node !== 'object') return;
  const last = parts[parts.length - 1];
  if (Array.isArray(node)) {
    const idx = Number(last);
    if (Number.isInteger(idx)) node[idx] = null;
    return;
  }
  delete node[last];
}

export function cloneValue(v) {
  if (v === null || v === undefined) return v;
  if (v instanceof ObjectId) return new ObjectId(v.id);
  if (v instanceof Date) return new Date(v.getTime());
  if (v instanceof RegExp) return new RegExp(v.source, v.flags);
  if (v instanceof Long || v instanceof Decimal128 || v instanceof Binary) return v;
  if (Buffer.isBuffer(v)) return Buffer.from(v);
  if (Array.isArray(v)) return v.map(cloneValue);
  if (typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) out[k] = cloneValue(v[k]);
    return out;
  }
  return v;
}

export { numeric };
