/**
 * Query matcher implementing the subset of the MongoDB query language
 * the application relies on.
 */
import { ObjectId, Long, Decimal128, Binary } from 'bson';
import { compareValues, valuesEqual, resolvePath, isNumeric, numeric, getPath } from './value.js';

const OPERATORS = new Set([
  '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$exists', '$regex',
  '$options', '$all', '$elemMatch', '$size', '$not', '$mod', '$type', '$near', '$text',
]);

function isOperatorExpression(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)
    && !(v instanceof ObjectId) && !(v instanceof RegExp) && !(v instanceof Long)
    && !(v instanceof Decimal128) && !(v instanceof Binary)
    && Object.keys(v).some((k) => k.startsWith('$'));
}

function toRegExp(pattern, options) {
  if (pattern instanceof RegExp) {
    return options ? new RegExp(pattern.source, options) : pattern;
  }
  if (pattern && typeof pattern === 'object' && pattern.pattern !== undefined) {
    return new RegExp(pattern.pattern, options ?? pattern.options ?? '');
  }
  return new RegExp(pattern, options ?? '');
}

const TYPE_ALIASES = {
  double: (v) => typeof v === 'number',
  string: (v) => typeof v === 'string',
  object: (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof ObjectId),
  array: (v) => Array.isArray(v),
  binData: (v) => v instanceof Binary || Buffer.isBuffer(v),
  objectId: (v) => v instanceof ObjectId,
  bool: (v) => typeof v === 'boolean',
  date: (v) => v instanceof Date,
  null: (v) => v === null,
  regex: (v) => v instanceof RegExp,
  int: (v) => typeof v === 'number' && Number.isInteger(v),
  long: (v) => v instanceof Long,
  decimal: (v) => v instanceof Decimal128,
  number: (v) => isNumeric(v),
};

function matchesType(value, spec) {
  const specs = Array.isArray(spec) ? spec : [spec];
  return specs.some((s) => {
    const key = typeof s === 'number' ? Object.keys(TYPE_ALIASES)[s] : s;
    const fn = TYPE_ALIASES[key];
    return fn ? fn(value) : false;
  });
}

/** Apply one operator to the set of values a path resolves to. */
function matchOperator(op, condition, candidates, fullCondition, doc, path) {
  const anyOf = (fn) => candidates.some(fn);

  switch (op) {
    case '$eq':
      return anyOf((v) => valuesEqual(v, condition))
        || (Array.isArray(condition) && candidates.some((v) => Array.isArray(v) && valuesEqual(v, condition)));
    case '$ne':
      return !matchOperator('$eq', condition, candidates, fullCondition, doc, path);
    case '$gt':
      return anyOf((v) => compareValues(v, condition) > 0);
    case '$gte':
      return anyOf((v) => compareValues(v, condition) >= 0);
    case '$lt':
      return anyOf((v) => v !== undefined && compareValues(v, condition) < 0);
    case '$lte':
      return anyOf((v) => v !== undefined && compareValues(v, condition) <= 0);
    case '$in':
      return anyOf((v) => condition.some((c) => {
        if (c instanceof RegExp) return typeof v === 'string' && c.test(v);
        if (Array.isArray(v) && !Array.isArray(c)) return v.some((item) => valuesEqual(item, c));
        return valuesEqual(v, c);
      })) || (candidates.length === 0 && condition.some((c) => c === null));
    case '$nin':
      return !matchOperator('$in', condition, candidates, fullCondition, doc, path);
    case '$exists': {
      const exists = candidates.some((v) => v !== undefined);
      return condition ? exists : !exists;
    }
    case '$regex': {
      const re = toRegExp(condition, fullCondition.$options);
      return anyOf((v) => {
        if (typeof v === 'string') return re.test(v);
        if (Array.isArray(v)) return v.some((item) => typeof item === 'string' && re.test(item));
        return false;
      });
    }
    case '$options':
      return true;
    case '$all':
      return anyOf((v) => {
        const arr = Array.isArray(v) ? v : [v];
        return condition.every((c) => {
          if (c && typeof c === 'object' && c.$elemMatch) {
            return arr.some((item) => matchesQuery(item, c.$elemMatch));
          }
          return arr.some((item) => valuesEqual(item, c));
        });
      });
    case '$size':
      return anyOf((v) => Array.isArray(v) && v.length === numeric(condition));
    case '$elemMatch':
      return anyOf((v) => {
        if (!Array.isArray(v)) return false;
        const asOperators = isOperatorExpression(condition);
        return v.some((item) => (asOperators
          ? matchFieldCondition(item, condition, doc, path)
          : matchesQuery(item, condition)));
      });
    case '$not': {
      if (condition instanceof RegExp) {
        return !matchOperator('$regex', condition, candidates, fullCondition, doc, path);
      }
      return !matchFieldCondition(undefined, condition, doc, path, candidates);
    }
    case '$mod':
      return anyOf((v) => isNumeric(v) && numeric(v) % numeric(condition[0]) === numeric(condition[1]));
    case '$type':
      return anyOf((v) => matchesType(v, condition));
    default:
      return true;
  }
}

function matchFieldCondition(_value, condition, doc, path, precomputed) {
  const candidates = precomputed ?? resolvePath(doc, path);
  return Object.entries(condition).every(([op, cond]) => {
    if (!op.startsWith('$')) return valuesEqual(candidates[0], condition);
    return matchOperator(op, cond, candidates, condition, doc, path);
  });
}

// $expr needs the aggregation expression evaluator, which in turn needs the
// matcher ($filter/$cond over $match). The aggregate module injects it here to
// keep the dependency one-directional at import time.
let expressionEvaluator = () => true;

export function setExpressionEvaluator(fn) {
  expressionEvaluator = fn;
}

function matchExpr(doc, expr) {
  return Boolean(expressionEvaluator(doc, expr));
}

export function matchesQuery(doc, query) {
  if (!query || Object.keys(query).length === 0) return true;
  if (doc === null || doc === undefined) return false;

  return Object.entries(query).every(([key, condition]) => {
    switch (key) {
      case '$and':
        return condition.every((sub) => matchesQuery(doc, sub));
      case '$or':
        return condition.some((sub) => matchesQuery(doc, sub));
      case '$nor':
        return !condition.some((sub) => matchesQuery(doc, sub));
      case '$expr':
        return matchExpr(doc, condition);
      case '$text': {
        const term = String(condition.$search || '').toLowerCase().replace(/"/g, '');
        if (!term) return true;
        const haystack = JSON.stringify(doc).toLowerCase();
        return term.split(/\s+/).some((word) => haystack.includes(word));
      }
      case '$comment':
      case '$where':
        return true;
      default:
        break;
    }

    const candidates = resolvePath(doc, key);

    if (condition instanceof RegExp) {
      return candidates.some((v) => {
        if (typeof v === 'string') return condition.test(v);
        if (Array.isArray(v)) return v.some((item) => typeof item === 'string' && condition.test(item));
        return false;
      });
    }

    if (isOperatorExpression(condition)) {
      return matchFieldCondition(undefined, condition, doc, key, candidates);
    }

    if (condition === null) {
      return candidates.length === 0 || candidates.some((v) => v === null || v === undefined);
    }

    return candidates.some((v) => {
      if (valuesEqual(v, condition)) return true;
      if (Array.isArray(v)) return v.some((item) => valuesEqual(item, condition));
      return false;
    });
  });
}

/** Build a comparator from a { field: 1 | -1 } sort spec. */
export function buildComparator(sortSpec) {
  const entries = Object.entries(sortSpec || {});
  return (a, b) => {
    for (const [field, dir] of entries) {
      const direction = numeric(dir) >= 0 ? 1 : -1;
      const av = pickSortValue(getPath(a, field), direction);
      const bv = pickSortValue(getPath(b, field), direction);
      const cmp = compareValues(av, bv);
      if (cmp !== 0) return cmp * direction;
    }
    return 0;
  };
}

function pickSortValue(value, direction) {
  if (!Array.isArray(value)) return value;
  if (value.length === 0) return undefined;
  const sorted = [...value].sort(compareValues);
  return direction === 1 ? sorted[0] : sorted[sorted.length - 1];
}
