/**
 * Aggregation pipeline + expression evaluator.
 * Supports the stages used by the storefront and admin analytics.
 */
import { ObjectId } from 'bson';
import { getPath, setPath, cloneValue, compareValues, valuesEqual, numeric, isNumeric } from './value.js';
import { matchesQuery, buildComparator, setExpressionEvaluator } from './match.js';
import { project } from './project.js';

const MISSING = Symbol('missing');

function isExpressionObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    && !(v instanceof Date) && !(v instanceof ObjectId) && !(v instanceof RegExp);
}

export function evaluateExpression(doc, expr, root = doc) {
  if (typeof expr === 'string') {
    if (expr.startsWith('$$')) {
      const name = expr.slice(2);
      if (name === 'ROOT') return root;
      if (name === 'NOW') return new Date();
      if (name === 'REMOVE') return MISSING;
      const vars = doc && doc.__vars__;
      if (vars && name.split('.')[0] in vars) {
        const [head, ...rest] = name.split('.');
        return rest.length ? getPath(vars[head], rest.join('.')) : vars[head];
      }
      return undefined;
    }
    if (expr.startsWith('$')) {
      const v = getPath(doc, expr.slice(1));
      return v === undefined ? undefined : v;
    }
    return expr;
  }

  if (Array.isArray(expr)) return expr.map((e) => evaluateExpression(doc, e, root));
  if (!isExpressionObject(expr)) return expr;

  const keys = Object.keys(expr);
  const operator = keys.find((k) => k.startsWith('$'));

  if (!operator) {
    const out = {};
    for (const [k, v] of Object.entries(expr)) {
      const val = evaluateExpression(doc, v, root);
      if (val !== MISSING) out[k] = val;
    }
    return out;
  }

  const arg = expr[operator];
  const evalArg = () => evaluateExpression(doc, arg, root);
  const evalList = () => (Array.isArray(arg) ? arg.map((a) => evaluateExpression(doc, a, root)) : [evaluateExpression(doc, arg, root)]);

  switch (operator) {
    case '$literal': return arg;
    case '$add': return evalList().reduce((acc, v) => {
      if (v instanceof Date) return new Date((acc || 0) + v.getTime());
      if (acc instanceof Date) return new Date(acc.getTime() + numeric(v));
      return (acc || 0) + (numeric(v) || 0);
    }, 0);
    case '$subtract': {
      const [a, b] = evalList();
      if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
      if (a instanceof Date) return new Date(a.getTime() - numeric(b));
      return numeric(a) - numeric(b);
    }
    case '$multiply': return evalList().reduce((acc, v) => acc * (numeric(v) || 0), 1);
    case '$divide': { const [a, b] = evalList(); return numeric(b) === 0 ? null : numeric(a) / numeric(b); }
    case '$mod': { const [a, b] = evalList(); return numeric(a) % numeric(b); }
    case '$abs': return Math.abs(numeric(evalArg()));
    case '$ceil': return Math.ceil(numeric(evalArg()));
    case '$floor': return Math.floor(numeric(evalArg()));
    case '$round': {
      const [v, place = 0] = evalList();
      const f = 10 ** numeric(place);
      return Math.round(numeric(v) * f) / f;
    }
    case '$trunc': return Math.trunc(numeric(evalArg()));
    case '$pow': { const [a, b] = evalList(); return numeric(a) ** numeric(b); }
    case '$sqrt': return Math.sqrt(numeric(evalArg()));

    case '$eq': { const [a, b] = evalList(); return valuesEqual(a, b); }
    case '$ne': { const [a, b] = evalList(); return !valuesEqual(a, b); }
    case '$gt': { const [a, b] = evalList(); return compareValues(a, b) > 0; }
    case '$gte': { const [a, b] = evalList(); return compareValues(a, b) >= 0; }
    case '$lt': { const [a, b] = evalList(); return compareValues(a, b) < 0; }
    case '$lte': { const [a, b] = evalList(); return compareValues(a, b) <= 0; }
    case '$cmp': { const [a, b] = evalList(); return compareValues(a, b); }

    case '$and': return evalList().every(truthy);
    case '$or': return evalList().some(truthy);
    case '$not': { const [a] = evalList(); return !truthy(a); }

    case '$cond': {
      if (Array.isArray(arg)) {
        const [c, t, f] = arg;
        return truthy(evaluateExpression(doc, c, root))
          ? evaluateExpression(doc, t, root)
          : evaluateExpression(doc, f, root);
      }
      return truthy(evaluateExpression(doc, arg.if, root))
        ? evaluateExpression(doc, arg.then, root)
        : evaluateExpression(doc, arg.else, root);
    }
    case '$switch': {
      for (const branch of arg.branches || []) {
        if (truthy(evaluateExpression(doc, branch.case, root))) {
          return evaluateExpression(doc, branch.then, root);
        }
      }
      return arg.default !== undefined ? evaluateExpression(doc, arg.default, root) : undefined;
    }
    case '$ifNull': {
      const values = evalList();
      for (let i = 0; i < values.length - 1; i += 1) {
        if (values[i] !== null && values[i] !== undefined && values[i] !== MISSING) return values[i];
      }
      return values[values.length - 1];
    }

    case '$concat': return evalList().map((v) => (v === null || v === undefined ? '' : String(v))).join('');
    case '$toUpper': return String(evalArg() ?? '').toUpperCase();
    case '$toLower': return String(evalArg() ?? '').toLowerCase();
    case '$trim': return String(evaluateExpression(doc, arg.input, root) ?? '').trim();
    case '$strLenCP': return String(evalArg() ?? '').length;
    case '$substr':
    case '$substrCP': { const [s, start, len] = evalList(); return String(s ?? '').substr(numeric(start), numeric(len)); }
    case '$split': { const [s, sep] = evalList(); return String(s ?? '').split(sep); }
    case '$regexMatch': {
      const input = String(evaluateExpression(doc, arg.input, root) ?? '');
      const re = new RegExp(evaluateExpression(doc, arg.regex, root), arg.options || '');
      return re.test(input);
    }

    case '$size': { const v = evalArg(); return Array.isArray(v) ? v.length : 0; }
    case '$isArray': return Array.isArray(evalArg());
    case '$arrayElemAt': { const [a, i] = evalList(); if (!Array.isArray(a)) return undefined; const idx = numeric(i); return idx < 0 ? a[a.length + idx] : a[idx]; }
    case '$first': { const v = evalArg(); return Array.isArray(v) ? v[0] : undefined; }
    case '$last': { const v = evalArg(); return Array.isArray(v) ? v[v.length - 1] : undefined; }
    case '$slice': { const [a, n, c] = evalList(); if (!Array.isArray(a)) return undefined; return c === undefined ? (numeric(n) < 0 ? a.slice(numeric(n)) : a.slice(0, numeric(n))) : a.slice(numeric(n), numeric(n) + numeric(c)); }
    case '$concatArrays': return evalList().reduce((acc, v) => acc.concat(Array.isArray(v) ? v : []), []);
    case '$in': { const [needle, arr] = evalList(); return Array.isArray(arr) && arr.some((v) => valuesEqual(v, needle)); }
    case '$indexOfArray': { const [arr, needle] = evalList(); return Array.isArray(arr) ? arr.findIndex((v) => valuesEqual(v, needle)) : -1; }
    case '$reverseArray': { const v = evalArg(); return Array.isArray(v) ? [...v].reverse() : v; }
    case '$setUnion': { const lists = evalList().filter(Array.isArray).flat(); const out = []; for (const v of lists) if (!out.some((o) => valuesEqual(o, v))) out.push(v); return out; }

    case '$map': {
      const input = evaluateExpression(doc, arg.input, root);
      if (!Array.isArray(input)) return null;
      const as = arg.as || 'this';
      return input.map((item) => evaluateExpression(withVar(doc, as, item), arg.in, root));
    }
    case '$filter': {
      const input = evaluateExpression(doc, arg.input, root);
      if (!Array.isArray(input)) return null;
      const as = arg.as || 'this';
      return input.filter((item) => truthy(evaluateExpression(withVar(doc, as, item), arg.cond, root)));
    }
    case '$reduce': {
      const input = evaluateExpression(doc, arg.input, root);
      if (!Array.isArray(input)) return null;
      let acc = evaluateExpression(doc, arg.initialValue, root);
      for (const item of input) {
        const scope = withVar(withVar(doc, 'this', item), 'value', acc);
        acc = evaluateExpression(scope, arg.in, root);
      }
      return acc;
    }
    case '$let': {
      let scope = doc;
      for (const [name, valueExpr] of Object.entries(arg.vars || {})) {
        scope = withVar(scope, name, evaluateExpression(doc, valueExpr, root));
      }
      return evaluateExpression(scope, arg.in, root);
    }

    case '$sum': {
      const v = Array.isArray(arg) ? evalList() : evalArg();
      if (Array.isArray(v)) return v.reduce((acc, x) => acc + (numeric(x) || 0), 0);
      return numeric(v) || 0;
    }
    case '$avg': {
      const v = evalArg();
      const list = (Array.isArray(v) ? v : [v]).filter(isNumeric).map(numeric);
      return list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
    }
    case '$max': { const v = evalArg(); const list = Array.isArray(v) ? v : [v]; return list.length ? list.reduce((a, b) => (compareValues(a, b) >= 0 ? a : b)) : null; }
    case '$min': { const v = evalArg(); const list = Array.isArray(v) ? v : [v]; return list.length ? list.reduce((a, b) => (compareValues(a, b) <= 0 ? a : b)) : null; }

    case '$toString': { const v = evalArg(); return v === null || v === undefined ? null : String(v instanceof ObjectId ? v.toHexString() : v); }
    case '$toInt': case '$toLong': { const v = numeric(evalArg()); return Number.isNaN(v) ? null : Math.trunc(v); }
    case '$toDouble': case '$toDecimal': { const v = numeric(evalArg()); return Number.isNaN(v) ? null : v; }
    case '$toBool': return truthy(evalArg());
    case '$toDate': { const v = evalArg(); return v instanceof Date ? v : new Date(v); }
    case '$toObjectId': { const v = evalArg(); return v instanceof ObjectId ? v : new ObjectId(String(v)); }
    case '$type': { const v = evalArg(); if (v === null) return 'null'; if (v === undefined) return 'missing'; if (Array.isArray(v)) return 'array'; if (v instanceof ObjectId) return 'objectId'; if (v instanceof Date) return 'date'; if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'double'; return typeof v; }

    case '$year': return asDate(evalArg())?.getFullYear();
    case '$month': return asDate(evalArg())?.getMonth() + 1;
    case '$dayOfMonth': return asDate(evalArg())?.getDate();
    case '$hour': return asDate(evalArg())?.getHours();
    case '$minute': return asDate(evalArg())?.getMinutes();
    case '$dayOfWeek': return (asDate(evalArg())?.getDay() ?? 0) + 1;
    case '$dateToString': {
      const d = asDate(evaluateExpression(doc, arg.date, root));
      if (!d) return null;
      const fmt = arg.format || '%Y-%m-%d';
      const pad = (n, w = 2) => String(n).padStart(w, '0');
      return fmt
        .replace(/%Y/g, d.getFullYear())
        .replace(/%m/g, pad(d.getMonth() + 1))
        .replace(/%d/g, pad(d.getDate()))
        .replace(/%H/g, pad(d.getHours()))
        .replace(/%M/g, pad(d.getMinutes()))
        .replace(/%S/g, pad(d.getSeconds()));
    }

    case '$mergeObjects': return evalList().reduce((acc, v) => Object.assign(acc, v && typeof v === 'object' ? v : {}), {});
    case '$objectToArray': { const v = evalArg() || {}; return Object.entries(v).map(([k, val]) => ({ k, v: val })); }
    case '$arrayToObject': { const v = evalArg() || []; const out = {}; for (const e of v) { if (Array.isArray(e)) out[e[0]] = e[1]; else out[e.k] = e.v; } return out; }

    default:
      return undefined;
  }
}

function withVar(doc, name, value) {
  const scope = Object.create(Object.getPrototypeOf(doc) || Object.prototype);
  Object.assign(scope, doc);
  scope.__vars__ = { ...(doc.__vars__ || {}), [name]: value };
  return scope;
}

function asDate(v) {
  if (v instanceof Date) return v;
  if (v === null || v === undefined) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function truthy(v) {
  return !(v === false || v === null || v === undefined || v === 0 || v === MISSING);
}

const ACCUMULATORS = {
  $sum: (values) => values.reduce((acc, v) => acc + (numeric(v) || 0), 0),
  $avg: (values) => {
    const nums = values.filter(isNumeric).map(numeric);
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  },
  $min: (values) => (values.length ? values.reduce((a, b) => (compareValues(a, b) <= 0 ? a : b)) : null),
  $max: (values) => (values.length ? values.reduce((a, b) => (compareValues(a, b) >= 0 ? a : b)) : null),
  $first: (values) => (values.length ? values[0] : null),
  $last: (values) => (values.length ? values[values.length - 1] : null),
  $push: (values) => values,
  $addToSet: (values) => {
    const out = [];
    for (const v of values) if (!out.some((o) => valuesEqual(o, v))) out.push(v);
    return out;
  },
  $count: (values) => values.length,
};

function groupKeyString(key) {
  if (key === null || key === undefined) return 'null';
  if (key instanceof ObjectId) return `oid:${key.toHexString()}`;
  if (key instanceof Date) return `date:${key.getTime()}`;
  if (typeof key === 'object') return `obj:${JSON.stringify(sortKeys(key))}`;
  return `${typeof key}:${String(key)}`;
}

function sortKeys(obj) {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj instanceof ObjectId) return obj.toHexString();
  if (obj instanceof Date) return obj.toISOString();
  if (obj && typeof obj === 'object') {
    return Object.keys(obj).sort().reduce((acc, k) => { acc[k] = sortKeys(obj[k]); return acc; }, {});
  }
  return obj;
}

/** Execute a pipeline. `lookup` resolves other collections for $lookup. */
export function runPipeline(docs, pipeline, ctx = {}) {
  let current = docs.map(cloneValue);

  for (const stage of pipeline || []) {
    const [name] = Object.keys(stage);
    const spec = stage[name];

    switch (name) {
      case '$match':
        current = current.filter((d) => matchesQuery(d, spec));
        break;

      case '$project':
        current = current.map((d) => project(d, spec, (doc, expr) => evaluateExpression(doc, expr)));
        break;

      case '$addFields':
      case '$set':
        current = current.map((d) => {
          const out = cloneValue(d);
          for (const [k, expr] of Object.entries(spec)) {
            const v = evaluateExpression(d, expr);
            if (v !== MISSING) setPath(out, k, v);
          }
          return out;
        });
        break;

      case '$unset': {
        const fields = Array.isArray(spec) ? spec : [spec];
        current = current.map((d) => {
          const out = cloneValue(d);
          for (const f of fields) delete out[f];
          return out;
        });
        break;
      }

      case '$sort':
        current.sort(buildComparator(spec));
        break;

      case '$skip':
        current = current.slice(numeric(spec));
        break;

      case '$limit':
        current = current.slice(0, numeric(spec));
        break;

      case '$count':
        current = [{ [spec]: current.length }];
        break;

      case '$group': {
        const groups = new Map();
        for (const d of current) {
          const key = evaluateExpression(d, spec._id);
          const ks = groupKeyString(key);
          if (!groups.has(ks)) groups.set(ks, { key, docs: [] });
          groups.get(ks).docs.push(d);
        }
        current = [...groups.values()].map(({ key, docs: groupDocs }) => {
          const out = { _id: key === MISSING ? null : key };
          for (const [field, accSpec] of Object.entries(spec)) {
            if (field === '_id') continue;
            const [accName] = Object.keys(accSpec);
            const accFn = ACCUMULATORS[accName];
            if (!accFn) continue;
            const values = accName === '$count'
              ? groupDocs
              : groupDocs.map((d) => evaluateExpression(d, accSpec[accName])).filter((v) => v !== undefined && v !== MISSING);
            out[field] = accFn(values);
          }
          return out;
        });
        break;
      }

      case '$unwind': {
        const path = typeof spec === 'string' ? spec : spec.path;
        const field = path.replace(/^\$/, '');
        const preserve = typeof spec === 'object' && spec.preserveNullAndEmptyArrays;
        const indexField = typeof spec === 'object' ? spec.includeArrayIndex : null;
        const out = [];
        for (const d of current) {
          const value = getPath(d, field);
          if (Array.isArray(value)) {
            if (value.length === 0 && preserve) { out.push(d); continue; }
            value.forEach((item, i) => {
              const copy = cloneValue(d);
              setPath(copy, field, item);
              if (indexField) setPath(copy, indexField, i);
              out.push(copy);
            });
          } else if (value !== undefined && value !== null) {
            out.push(d);
          } else if (preserve) {
            out.push(d);
          }
        }
        current = out;
        break;
      }

      case '$lookup': {
        const foreignDocs = ctx.lookup ? ctx.lookup(spec.from) : [];
        current = current.map((d) => {
          const out = cloneValue(d);
          if (spec.pipeline) {
            const vars = {};
            for (const [k, expr] of Object.entries(spec.let || {})) vars[k] = evaluateExpression(d, expr);
            const scoped = foreignDocs.map((fd) => {
              const copy = cloneValue(fd);
              copy.__vars__ = vars;
              return copy;
            });
            const res = runPipeline(scoped, spec.pipeline, ctx).map((r) => { delete r.__vars__; return r; });
            out[spec.as] = res;
          } else {
            const localValue = getPath(d, spec.localField);
            const locals = Array.isArray(localValue) ? localValue : [localValue];
            out[spec.as] = foreignDocs.filter((fd) => {
              const fv = getPath(fd, spec.foreignField);
              const foreigns = Array.isArray(fv) ? fv : [fv];
              return locals.some((l) => foreigns.some((f) => valuesEqual(l, f)));
            }).map(cloneValue);
          }
          return out;
        });
        break;
      }

      case '$facet': {
        const out = {};
        for (const [facetName, facetPipeline] of Object.entries(spec)) {
          out[facetName] = runPipeline(current, facetPipeline, ctx);
        }
        current = [out];
        break;
      }

      case '$replaceRoot':
      case '$replaceWith': {
        const expr = name === '$replaceRoot' ? spec.newRoot : spec;
        current = current.map((d) => evaluateExpression(d, expr)).filter((d) => d && typeof d === 'object');
        break;
      }

      case '$sample':
        current = [...current].sort(() => Math.random() - 0.5).slice(0, numeric(spec.size));
        break;

      case '$sortByCount': {
        const grouped = runPipeline(current, [
          { $group: { _id: spec, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ], ctx);
        current = grouped;
        break;
      }

      default:
        break;
    }
  }

  return current;
}

// Close the loop for $expr inside $match.
setExpressionEvaluator((doc, expr) => evaluateExpression(doc, expr));
