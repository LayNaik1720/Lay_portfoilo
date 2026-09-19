/**
 * Field projection for find() and $project.
 */
import { getPath, setPath, cloneValue, numeric } from './value.js';
import { matchesQuery } from './match.js';

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && v.constructor === Object;
}

export function project(doc, spec, evaluate) {
  if (!spec || Object.keys(spec).length === 0) return cloneValue(doc);

  const entries = Object.entries(spec).filter(([k]) => k !== '_id');
  const inclusionKeys = [];
  const exclusionKeys = [];
  const computed = [];

  for (const [key, value] of entries) {
    if (value === 1 || value === true || numeric(value) === 1) inclusionKeys.push(key);
    else if (value === 0 || value === false) exclusionKeys.push(key);
    else if (isPlainObject(value) && (value.$slice !== undefined || value.$elemMatch !== undefined)) {
      computed.push([key, value, 'array-op']);
    } else computed.push([key, value, 'expression']);
  }

  const isInclusion = inclusionKeys.length > 0 || computed.length > 0;

  let out;
  if (isInclusion) {
    out = {};
    if (spec._id !== 0 && spec._id !== false && doc._id !== undefined) out._id = cloneValue(doc._id);
    for (const key of inclusionKeys) {
      const value = getPath(doc, key);
      if (value !== undefined) setPath(out, key, cloneValue(value));
    }
    for (const [key, value, kind] of computed) {
      if (kind === 'array-op') {
        const arr = getPath(doc, key);
        if (!Array.isArray(arr)) continue;
        if (value.$slice !== undefined) {
          const s = value.$slice;
          const sliced = Array.isArray(s)
            ? arr.slice(numeric(s[0]), numeric(s[0]) + numeric(s[1]))
            : (numeric(s) < 0 ? arr.slice(numeric(s)) : arr.slice(0, numeric(s)));
          setPath(out, key, cloneValue(sliced));
        } else if (value.$elemMatch !== undefined) {
          const found = arr.find((item) => matchesQuery(item, value.$elemMatch));
          if (found !== undefined) setPath(out, key, cloneValue(found));
        }
      } else if (evaluate) {
        const result = evaluate(doc, value);
        if (result !== undefined) setPath(out, key, result);
      }
    }
  } else {
    out = cloneValue(doc);
    for (const key of exclusionKeys) {
      const parts = key.split('.');
      let node = out;
      for (let i = 0; i < parts.length - 1 && node; i += 1) node = node[parts[i]];
      if (node && typeof node === 'object') delete node[parts[parts.length - 1]];
    }
    if (spec._id === 0 || spec._id === false) delete out._id;
  }

  return out;
}
