/**
 * Update operator engine ($set, $inc, $push, array filters, upsert shaping...).
 */
import { ObjectId } from 'bson';
import { getPath, setPath, unsetPath, cloneValue, valuesEqual, numeric, isNumeric } from './value.js';
import { matchesQuery, buildComparator } from './match.js';

function isUpdateDocument(update) {
  return Object.keys(update || {}).some((k) => k.startsWith('$'));
}

/** Expand `arr.$[tag].field` / `arr.$.field` against a concrete document. */
function expandPositional(doc, path, arrayFilters, matchedQuery) {
  const parts = String(path).split('.');
  const out = [[]];

  for (const part of parts) {
    const positionalAll = part === '$[]';
    const identifier = /^\$\[(.+)\]$/.exec(part);
    const firstMatch = part === '$';

    if (!positionalAll && !identifier && !firstMatch) {
      out.forEach((p) => p.push(part));
      continue;
    }

    const expanded = [];
    for (const prefix of out) {
      const arr = prefix.length ? getPath(doc, prefix.join('.')) : doc;
      if (!Array.isArray(arr)) continue;

      if (positionalAll) {
        arr.forEach((_, i) => expanded.push([...prefix, String(i)]));
      } else if (identifier) {
        const filterName = identifier[1];
        const filter = (arrayFilters || []).find((f) => Object.keys(f).some((k) => k.split('.')[0] === filterName));
        arr.forEach((item, i) => {
          if (!filter) return;
          const normalized = {};
          for (const [k, v] of Object.entries(filter)) {
            const rest = k.split('.').slice(1).join('.');
            normalized[rest || '__self__'] = v;
          }
          const target = normalized.__self__ !== undefined ? { __self__: item } : item;
          if (matchesQuery(target, normalized)) expanded.push([...prefix, String(i)]);
        });
      } else if (firstMatch) {
        const idx = findFirstMatchingIndex(arr, prefix.join('.'), matchedQuery);
        expanded.push([...prefix, String(idx >= 0 ? idx : 0)]);
      }
    }
    out.length = 0;
    out.push(...expanded);
    if (out.length === 0) return [];
  }
  return out.map((p) => p.join('.'));
}

function findFirstMatchingIndex(arr, arrayPath, query) {
  if (!query) return 0;
  const relevant = {};
  for (const [k, v] of Object.entries(query)) {
    if (k.startsWith(`${arrayPath}.`)) relevant[k.slice(arrayPath.length + 1)] = v;
  }
  if (Object.keys(relevant).length === 0) {
    const direct = query[arrayPath];
    if (direct !== undefined) {
      return arr.findIndex((item) => matchesQuery({ v: item }, { v: direct }));
    }
    return 0;
  }
  const idx = arr.findIndex((item) => matchesQuery(item, relevant));
  return idx;
}

function targetPaths(doc, path, arrayFilters, matchedQuery) {
  if (!/\$/.test(path)) return [path];
  const expanded = expandPositional(doc, path, arrayFilters, matchedQuery);
  return expanded.length ? expanded : [];
}

export function applyUpdate(doc, update, options = {}) {
  const { arrayFilters = [], matchedQuery = null } = options;

  if (!isUpdateDocument(update)) {
    const replacement = cloneValue(update);
    const id = doc._id;
    for (const key of Object.keys(doc)) delete doc[key];
    Object.assign(doc, replacement);
    if (id !== undefined && replacement._id === undefined) doc._id = id;
    return doc;
  }

  for (const [op, spec] of Object.entries(update)) {
    switch (op) {
      case '$set':
        for (const [path, value] of Object.entries(spec)) {
          for (const p of targetPaths(doc, path, arrayFilters, matchedQuery)) {
            setPath(doc, p, cloneValue(value));
          }
        }
        break;

      case '$setOnInsert':
        if (options.isInsert) {
          for (const [path, value] of Object.entries(spec)) setPath(doc, path, cloneValue(value));
        }
        break;

      case '$unset':
        for (const path of Object.keys(spec)) {
          for (const p of targetPaths(doc, path, arrayFilters, matchedQuery)) unsetPath(doc, p);
        }
        break;

      case '$inc':
        for (const [path, delta] of Object.entries(spec)) {
          for (const p of targetPaths(doc, path, arrayFilters, matchedQuery)) {
            const current = getPath(doc, p);
            const base = isNumeric(current) ? numeric(current) : 0;
            setPath(doc, p, base + numeric(delta));
          }
        }
        break;

      case '$mul':
        for (const [path, factor] of Object.entries(spec)) {
          for (const p of targetPaths(doc, path, arrayFilters, matchedQuery)) {
            const current = getPath(doc, p);
            const base = isNumeric(current) ? numeric(current) : 0;
            setPath(doc, p, base * numeric(factor));
          }
        }
        break;

      case '$min':
        for (const [path, value] of Object.entries(spec)) {
          const current = getPath(doc, path);
          if (current === undefined || numeric(value) < numeric(current)) setPath(doc, path, value);
        }
        break;

      case '$max':
        for (const [path, value] of Object.entries(spec)) {
          const current = getPath(doc, path);
          if (current === undefined || numeric(value) > numeric(current)) setPath(doc, path, value);
        }
        break;

      case '$currentDate':
        for (const path of Object.keys(spec)) setPath(doc, path, new Date());
        break;

      case '$rename':
        for (const [from, to] of Object.entries(spec)) {
          const value = getPath(doc, from);
          if (value !== undefined) {
            unsetPath(doc, from);
            setPath(doc, to, value);
          }
        }
        break;

      case '$push':
        for (const [path, value] of Object.entries(spec)) {
          for (const p of targetPaths(doc, path, arrayFilters, matchedQuery)) pushInto(doc, p, value);
        }
        break;

      case '$addToSet':
        for (const [path, value] of Object.entries(spec)) {
          for (const p of targetPaths(doc, path, arrayFilters, matchedQuery)) {
            const arr = ensureArray(doc, p);
            const items = value && value.$each ? value.$each : [value];
            for (const item of items) {
              if (!arr.some((existing) => valuesEqual(existing, item))) arr.push(cloneValue(item));
            }
          }
        }
        break;

      case '$pull':
        for (const [path, condition] of Object.entries(spec)) {
          for (const p of targetPaths(doc, path, arrayFilters, matchedQuery)) {
            const arr = getPath(doc, p);
            if (!Array.isArray(arr)) continue;
            const kept = arr.filter((item) => !matchesPullCondition(item, condition));
            setPath(doc, p, kept);
          }
        }
        break;

      case '$pullAll':
        for (const [path, values] of Object.entries(spec)) {
          const arr = getPath(doc, path);
          if (!Array.isArray(arr)) continue;
          setPath(doc, path, arr.filter((item) => !values.some((v) => valuesEqual(item, v))));
        }
        break;

      case '$pop':
        for (const [path, direction] of Object.entries(spec)) {
          const arr = getPath(doc, path);
          if (!Array.isArray(arr) || arr.length === 0) continue;
          if (numeric(direction) < 0) arr.shift();
          else arr.pop();
        }
        break;

      case '$bit':
        for (const [path, ops] of Object.entries(spec)) {
          const current = numeric(getPath(doc, path)) || 0;
          let next = current;
          if (ops.and !== undefined) next &= numeric(ops.and);
          if (ops.or !== undefined) next |= numeric(ops.or);
          if (ops.xor !== undefined) next ^= numeric(ops.xor);
          setPath(doc, path, next);
        }
        break;

      default:
        break;
    }
  }
  return doc;
}

function matchesPullCondition(item, condition) {
  if (condition !== null && typeof condition === 'object' && !Array.isArray(condition)
      && !(condition instanceof Date) && !(condition instanceof ObjectId)) {
    const hasOperators = Object.keys(condition).some((k) => k.startsWith('$'));
    if (hasOperators) return matchesQuery({ __v: item }, { __v: condition });
    return matchesQuery(item, condition);
  }
  return valuesEqual(item, condition);
}

function ensureArray(doc, path) {
  let arr = getPath(doc, path);
  if (!Array.isArray(arr)) {
    arr = [];
    setPath(doc, path, arr);
  }
  return arr;
}

function pushInto(doc, path, value) {
  const arr = ensureArray(doc, path);
  if (value && typeof value === 'object' && value.$each !== undefined) {
    let items = value.$each.map(cloneValue);
    if (value.$position !== undefined) {
      arr.splice(numeric(value.$position), 0, ...items);
    } else {
      arr.push(...items);
    }
    if (value.$sort !== undefined) {
      const cmp = typeof value.$sort === 'object'
        ? buildComparator(value.$sort)
        : (a, b) => (numeric(value.$sort) >= 0 ? 1 : -1) * (a > b ? 1 : a < b ? -1 : 0);
      arr.sort(cmp);
    }
    if (value.$slice !== undefined) {
      const n = numeric(value.$slice);
      const sliced = n >= 0 ? arr.slice(0, n) : arr.slice(n);
      setPath(doc, path, sliced);
    }
    return;
  }
  arr.push(cloneValue(value));
}

/** Seed an upserted document from the query's equality constraints. */
export function buildUpsertDocument(query, update, arrayFilters) {
  const doc = {};
  for (const [key, value] of Object.entries(query || {})) {
    if (key.startsWith('$')) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)
        && !(value instanceof Date) && !(value instanceof ObjectId)) {
      const ops = Object.keys(value).filter((k) => k.startsWith('$'));
      if (ops.length) {
        if (value.$eq !== undefined) setPath(doc, key, cloneValue(value.$eq));
        continue;
      }
    }
    setPath(doc, key, cloneValue(value));
  }
  if (isUpdateDocument(update)) {
    applyUpdate(doc, update, { arrayFilters, isInsert: true, matchedQuery: query });
  } else {
    Object.assign(doc, cloneValue(update));
  }
  if (doc._id === undefined) doc._id = new ObjectId();
  return doc;
}

export { isUpdateDocument };
