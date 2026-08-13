import { DataType, TypeDetectionResult } from '../types/json';

/**
 * Auto-detects data type from a single plain-text input string following strict rules.
 */
export function detectType(rawInput: string): TypeDetectionResult {
  const trimmed = rawInput.trim();

  // 1. Empty string -> String
  if (trimmed === '') {
    return {
      type: 'string',
      parsedValue: '',
      isInvalidJsonSyntax: false,
      rawInput,
    };
  }

  // 2. Null (case-insensitive)
  if (trimmed.toLowerCase() === 'null') {
    return {
      type: 'null',
      parsedValue: null,
      isInvalidJsonSyntax: false,
      rawInput,
    };
  }

  // 3. Boolean (case-insensitive)
  if (trimmed.toLowerCase() === 'true') {
    return {
      type: 'boolean',
      parsedValue: true,
      isInvalidJsonSyntax: false,
      rawInput,
    };
  }
  if (trimmed.toLowerCase() === 'false') {
    return {
      type: 'boolean',
      parsedValue: false,
      isInvalidJsonSyntax: false,
      rawInput,
    };
  }

  // 4. Number pattern
  // Matches integer or decimal, optional leading minus.
  // Preserves leading zeros like "01923" as string by requiring standard number representation.
  const isNumberPattern = /^-?(0|[1-9]\d*)(\.\d+)?$/.test(trimmed);
  if (isNumberPattern) {
    const num = Number(trimmed);
    if (!isNaN(num) && isFinite(num)) {
      return {
        type: 'number',
        parsedValue: num,
        isInvalidJsonSyntax: false,
        rawInput,
      };
    }
  }

  // 5. Array attempt (starts with [ and ends with ])
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return {
          type: 'array',
          parsedValue: parsed,
          isInvalidJsonSyntax: false,
          rawInput,
        };
      }
    } catch {
      return {
        type: 'array',
        parsedValue: trimmed,
        isInvalidJsonSyntax: true,
        warningMessage: "This looks like an array but isn't valid JSON — check quotes/commas",
        rawInput,
      };
    }
  }

  // 6. Object attempt (starts with { and ends with })
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return {
          type: 'object',
          parsedValue: parsed,
          isInvalidJsonSyntax: false,
          rawInput,
        };
      }
    } catch {
      return {
        type: 'object',
        parsedValue: trimmed,
        isInvalidJsonSyntax: true,
        warningMessage: "This looks like an object but isn't valid JSON — check quotes/commas",
        rawInput,
      };
    }
  }

  // 7. Fallback -> String
  return {
    type: 'string',
    parsedValue: rawInput,
    isInvalidJsonSyntax: false,
    rawInput,
  };
}

/**
 * Manually forces string input into a specific target data type.
 */
export function coerceType(rawInput: string, targetType: DataType): { parsedValue: any; isValid: boolean; error?: string } {
  const trimmed = rawInput.trim();

  switch (targetType) {
    case 'string':
      return { parsedValue: rawInput, isValid: true };
    
    case 'number': {
      const num = Number(trimmed);
      if (trimmed !== '' && !isNaN(num) && isFinite(num)) {
        return { parsedValue: num, isValid: true };
      }
      return { parsedValue: 0, isValid: false, error: 'Invalid number format' };
    }

    case 'boolean': {
      if (trimmed.toLowerCase() === 'true' || trimmed === '1') return { parsedValue: true, isValid: true };
      if (trimmed.toLowerCase() === 'false' || trimmed === '0') return { parsedValue: false, isValid: true };
      return { parsedValue: Boolean(trimmed), isValid: true };
    }

    case 'null':
      return { parsedValue: null, isValid: true };

    case 'array': {
      try {
        const parsed = JSON.parse(trimmed || '[]');
        if (Array.isArray(parsed)) {
          return { parsedValue: parsed, isValid: true };
        }
        return { parsedValue: [], isValid: false, error: 'JSON parsed but result is not an Array' };
      } catch (err: any) {
        return { parsedValue: [], isValid: false, error: err.message || 'Invalid JSON Array' };
      }
    }

    case 'object': {
      try {
        const parsed = JSON.parse(trimmed || '{}');
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { parsedValue: parsed, isValid: true };
        }
        return { parsedValue: {}, isValid: false, error: 'JSON parsed but result is not an Object' };
      } catch (err: any) {
        return { parsedValue: {}, isValid: false, error: err.message || 'Invalid JSON Object' };
      }
    }
  }
}

/**
 * Returns type badge styling & label for UI
 */
export function getTypeBadgeInfo(type: DataType) {
  switch (type) {
    case 'string':
      return { label: 'String', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', icon: 'abc' };
    case 'number':
      return { label: 'Number', color: 'bg-sky-500/20 text-sky-400 border-sky-500/40', icon: '123' };
    case 'boolean':
      return { label: 'Boolean', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40', icon: 'T/F' };
    case 'null':
      return { label: 'Null', color: 'bg-slate-500/20 text-slate-400 border-slate-500/40', icon: 'Ø' };
    case 'array':
      return { label: 'Array', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', icon: '[ ]' };
    case 'object':
      return { label: 'Object', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40', icon: '{ }' };
  }
}
