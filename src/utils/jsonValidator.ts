/**
 * Advanced JSON Validator, Error Pinpointer, and Auto-Repair Utility
 */

export interface JsonErrorLocation {
  line: number; // 1-based
  column: number; // 1-based
  position: number; // 0-based character index
  lineContent: string;
  snippet: {
    startLine: number;
    lines: Array<{
      lineNum: number;
      text: string;
      isErrorLine: boolean;
      indicator?: string;
    }>;
  };
}

export type JsonErrorCategory =
  | 'trailing_comma'
  | 'single_quotes'
  | 'unquoted_key'
  | 'missing_comma'
  | 'missing_colon'
  | 'unclosed_string'
  | 'unclosed_bracket'
  | 'extra_bracket'
  | 'comment'
  | 'python_literal'
  | 'invalid_number'
  | 'empty_input'
  | 'syntax_error';

export interface JsonErrorInfo {
  title: string;
  message: string;
  rawMessage: string;
  category: JsonErrorCategory;
  suggestion: string;
  location: JsonErrorLocation;
  autoFixable: boolean;
}

export interface JsonValidationResult {
  isValid: boolean;
  parsedData?: any;
  error?: JsonErrorInfo;
  stats: {
    linesCount: number;
    charsCount: number;
    sizeFormatted: string;
  };
}

export interface AutoRepairResult {
  success: boolean;
  repairedText: string;
  fixesApplied: string[];
  parsedData?: any;
  error?: string;
}

/**
 * Formats byte size into human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Extracts line, column, and snippet from a character position in text
 */
function getLocationFromPosition(text: string, position: number): JsonErrorLocation {
  const safePos = Math.max(0, Math.min(position, text.length));
  const lines = text.split('\n');

  let currentPos = 0;
  let lineIndex = 0;
  let colIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineLen = lines[i].length + 1; // +1 for newline character
    if (currentPos + lineLen > safePos || i === lines.length - 1) {
      lineIndex = i;
      colIndex = Math.max(0, safePos - currentPos);
      break;
    }
    currentPos += lineLen;
  }

  const lineNum = lineIndex + 1;
  const colNum = colIndex + 1;
  const lineContent = lines[lineIndex] || '';

  // Generate a multi-line snippet around the error (2 lines before, 2 lines after)
  const startIdx = Math.max(0, lineIndex - 2);
  const endIdx = Math.min(lines.length - 1, lineIndex + 2);
  const snippetLines: Array<{ lineNum: number; text: string; isErrorLine: boolean; indicator?: string }> = [];

  for (let i = startIdx; i <= endIdx; i++) {
    const isErr = i === lineIndex;
    snippetLines.push({
      lineNum: i + 1,
      text: lines[i],
      isErrorLine: isErr,
    });
    if (isErr) {
      const padLen = Math.max(0, colIndex);
      const indicator = ' '.repeat(padLen) + '^';
      snippetLines.push({
        lineNum: i + 1,
        text: indicator,
        isErrorLine: true,
        indicator,
      });
    }
  }

  return {
    line: lineNum,
    column: colNum,
    position: safePos,
    lineContent,
    snippet: {
      startLine: startIdx + 1,
      lines: snippetLines,
    },
  };
}

/**
 * Parses native JSON.parse SyntaxError to extract line, column, or character offset
 */
function extractPositionFromError(err: Error, text: string): number {
  const msg = err.message || '';

  // Pattern 1: "at position 123" / "in JSON at position 123" (Chrome, Edge, Node V8)
  const posMatch = msg.match(/position\s+(\d+)/i);
  if (posMatch) {
    const pos = parseInt(posMatch[1], 10);
    if (!isNaN(pos)) return pos;
  }

  // Pattern 2: "line 5 column 12" (Firefox, Safari)
  const lineColMatch = msg.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineColMatch) {
    const l = parseInt(lineColMatch[1], 10);
    const c = parseInt(lineColMatch[2], 10);
    if (!isNaN(l) && !isNaN(c)) {
      const lines = text.split('\n');
      let p = 0;
      for (let i = 0; i < l - 1 && i < lines.length; i++) {
        p += lines[i].length + 1;
      }
      return p + (c - 1);
    }
  }

  // Fallback: heuristic scan to find first suspicious character
  return findFirstErrorPositionHeuristic(text);
}

/**
 * Heuristic fallback to find the likely error position if JSON.parse error doesn't specify
 */
function findFirstErrorPositionHeuristic(text: string): number {
  let inString = false;
  let quoteChar = '';
  let isEscaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === '\\') {
        isEscaped = true;
      } else if (ch === quoteChar) {
        inString = false;
      } else if (ch === '\n') {
        // Unescaped newline in string literal
        return i;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      quoteChar = ch;
      continue;
    }

    // Check for comments
    if (ch === '/' && (text[i + 1] === '/' || text[i + 1] === '*')) {
      return i;
    }

    // Check for trailing commas e.g. ,} or ,]
    if (ch === ',') {
      let nextIdx = i + 1;
      while (nextIdx < text.length && /\s/.test(text[nextIdx])) {
        nextIdx++;
      }
      if (text[nextIdx] === '}' || text[nextIdx] === ']') {
        return i;
      }
    }
  }

  return Math.max(0, text.length - 1);
}

/**
 * Categorizes the error and generates specific plain-English suggestions
 */
function categorizeError(text: string, location: JsonErrorLocation, rawErrorMsg: string): {
  title: string;
  message: string;
  category: JsonErrorCategory;
  suggestion: string;
  autoFixable: boolean;
} {
  const { lineContent, position, column } = location;
  const beforePos = text.slice(Math.max(0, position - 40), position);
  const afterPos = text.slice(position, Math.min(text.length, position + 40));
  const snippetAround = beforePos + afterPos;

  // 1. Trailing Comma Check
  if (
    /,\s*[}\]]/.test(snippetAround) ||
    /,\s*$/.test(lineContent.slice(0, column + 2)) && /^\s*[}\]]/.test(afterPos)
  ) {
    return {
      title: 'Trailing Comma',
      message: `Extra comma before closing bracket/brace at Line ${location.line}, Column ${location.column}.`,
      category: 'trailing_comma',
      suggestion: 'Remove the trailing comma after the last property or item.',
      autoFixable: true,
    };
  }

  // 2. Single Quotes Check
  if (/'/.test(lineContent) || /'/.test(snippetAround)) {
    return {
      title: 'Single Quotes Used',
      message: `JSON requires double quotes (""), but single quotes (') were detected at Line ${location.line}.`,
      category: 'single_quotes',
      suggestion: 'Replace single quotes (\') with standard double quotes (").',
      autoFixable: true,
    };
  }

  // 3. Comments in JSON
  if (/\/\/|\/\*/.test(snippetAround) || /\/\/|\/\*/.test(lineContent)) {
    return {
      title: 'Comment in JSON',
      message: `Standard JSON does not allow comments (found at Line ${location.line}).`,
      category: 'comment',
      suggestion: 'Remove Javascript/C-style comments (// or /* */) from JSON.',
      autoFixable: true,
    };
  }

  // 4. Python Literals (True, False, None)
  if (/\b(True|False|None)\b/.test(lineContent) || /\b(True|False|None)\b/.test(snippetAround)) {
    return {
      title: 'Python Literals Used',
      message: `Python literals (True, False, None) detected near Line ${location.line}.`,
      category: 'python_literal',
      suggestion: 'Replace `True` with `true`, `False` with `false`, and `None` with `null`.',
      autoFixable: true,
    };
  }

  // 5. Unquoted Keys in Object
  if (/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/.test(lineContent) || /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/.test(snippetAround)) {
    return {
      title: 'Unquoted Property Key',
      message: `Property key is missing enclosing double quotes at Line ${location.line}, Column ${location.column}.`,
      category: 'unquoted_key',
      suggestion: 'Wrap all object keys in double quotes, e.g. "key": "value".',
      autoFixable: true,
    };
  }

  // 6. Missing Colon
  if (/("[^"]+"|'[^']+'|[a-zA-Z0-9_]+)\s+("[^"]+"|'[^']+'|[0-9]+|true|false|null|{|\[)/.test(lineContent)) {
    return {
      title: 'Missing Colon',
      message: `Missing colon (:) between property key and value at Line ${location.line}.`,
      category: 'missing_colon',
      suggestion: 'Add a colon (:) between the key and its value, e.g. "name": "value".',
      autoFixable: false,
    };
  }

  // 7. Missing Comma
  if (
    /("[^"]+"|'[^']+'|\d+|true|false|null|}|\])\s+("[^"]+"|'[^']+'|[a-zA-Z0-9_$]+|\d+|true|false|null|{|\[)/.test(lineContent) ||
    rawErrorMsg.toLowerCase().includes('expected') ||
    rawErrorMsg.toLowerCase().includes('comma')
  ) {
    return {
      title: 'Missing Comma',
      message: `Missing comma (,) separating elements or properties at Line ${location.line}, Column ${location.column}.`,
      category: 'missing_comma',
      suggestion: 'Add a comma (,) to separate list items or object properties.',
      autoFixable: true,
    };
  }

  // 8. Unclosed String
  if (rawErrorMsg.toLowerCase().includes('string') || rawErrorMsg.toLowerCase().includes('unterminated')) {
    return {
      title: 'Unclosed String Literal',
      message: `String is not closed with a matching quotation mark at Line ${location.line}.`,
      category: 'unclosed_string',
      suggestion: 'Add a closing double quotation mark (") to terminate the string.',
      autoFixable: false,
    };
  }

  // 9. Bracket Mismatch
  if (rawErrorMsg.toLowerCase().includes('bracket') || rawErrorMsg.toLowerCase().includes('brace') || /unexpected end/i.test(rawErrorMsg)) {
    return {
      title: 'Unclosed Brackets or Braces',
      message: `Mismatched or unclosed curly brace { } or bracket [ ] at Line ${location.line}.`,
      category: 'unclosed_bracket',
      suggestion: 'Ensure every opening `{` and `[` has a matching closing `}` and `]`.',
      autoFixable: false,
    };
  }

  // 10. General Syntax Error
  return {
    title: 'Syntax Error',
    message: `Invalid JSON syntax at Line ${location.line}, Column ${location.column}: ${rawErrorMsg}`,
    category: 'syntax_error',
    suggestion: 'Inspect the highlighted character position and ensure standard JSON format.',
    autoFixable: false,
  };
}

/**
 * Validates a JSON string and provides comprehensive error diagnostics with exact location
 */
export function validateJson(raw: string): JsonValidationResult {
  const text = raw ?? '';
  const linesCount = text.split('\n').length;
  const charsCount = text.length;
  const sizeFormatted = formatBytes(new Blob([text]).size);

  const stats = {
    linesCount,
    charsCount,
    sizeFormatted,
  };

  if (!text.trim()) {
    const location = getLocationFromPosition(text, 0);
    return {
      isValid: false,
      stats,
      error: {
        title: 'Empty Input',
        message: 'JSON input is empty. Please enter or upload valid JSON.',
        rawMessage: 'Unexpected end of JSON input',
        category: 'empty_input',
        suggestion: 'Provide a valid JSON object (e.g. {}) or array (e.g. []).',
        location,
        autoFixable: false,
      },
    };
  }

  try {
    const parsedData = JSON.parse(text);
    return {
      isValid: true,
      parsedData,
      stats,
    };
  } catch (err: any) {
    const pos = extractPositionFromError(err, text);
    const location = getLocationFromPosition(text, pos);
    const cat = categorizeError(text, location, err.message || 'SyntaxError');

    return {
      isValid: false,
      stats,
      error: {
        title: cat.title,
        message: cat.message,
        rawMessage: err.message || 'SyntaxError',
        category: cat.category,
        suggestion: cat.suggestion,
        location,
        autoFixable: cat.autoFixable,
      },
    };
  }
}

/**
 * Intelligent Auto-Repair engine for common JSON mistakes
 */
export function autoRepairJson(raw: string): AutoRepairResult {
  if (!raw || !raw.trim()) {
    return {
      success: false,
      repairedText: '{}',
      fixesApplied: [],
      error: 'Empty input cannot be auto-repaired.',
    };
  }

  let text = raw;
  const fixes: string[] = [];

  // Step 1: Normalize smart/curly quotes
  if (/[“”‘’]/.test(text)) {
    text = text
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");
    fixes.push('Replaced smart/curly quotes with standard quotes');
  }

  // Step 2: Strip comments (// ... and /* ... */)
  const commentRegex = /\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm;
  if (commentRegex.test(text)) {
    text = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    fixes.push('Removed JavaScript comments');
  }

  // Step 3: Replace Python literals (True -> true, False -> false, None -> null)
  if (/\b(True|False|None)\b/.test(text)) {
    text = text
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null');
    fixes.push('Converted Python literals (True/False/None) to JSON equivalents');
  }

  // Step 4: Replace JS undefined / NaN with null
  if (/\b(undefined|NaN)\b/.test(text)) {
    text = text
      .replace(/\bundefined\b/g, 'null')
      .replace(/\bNaN\b/g, 'null');
    fixes.push('Replaced undefined / NaN with null');
  }

  // Step 5: Convert single quoted strings to double quotes while respecting escaped single quotes
  // Replaces 'something' with "something"
  const singleQuoteStringRegex = /'((?:\\.|[^'\\])*)'/g;
  if (singleQuoteStringRegex.test(text)) {
    text = text.replace(singleQuoteStringRegex, (_, content) => {
      // Unescape single quotes and escape double quotes
      const fixed = content.replace(/\\'/g, "'").replace(/"/g, '\\"');
      return `"${fixed}"`;
    });
    fixes.push('Converted single quotes to double quotes');
  }

  // Step 6: Quote unquoted object keys (e.g. { foo: 123, bar_baz: "test" } -> { "foo": 123, "bar_baz": "test" })
  const unquotedKeyRegex = /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/g;
  if (unquotedKeyRegex.test(text)) {
    text = text.replace(unquotedKeyRegex, '$1"$2":');
    fixes.push('Wrapped unquoted object keys in double quotes');
  }

  // Step 7: Remove trailing commas before } or ] (e.g. [1, 2,] or {"a": 1,})
  const trailingCommaRegex = /,\s*([}\]])/g;
  if (trailingCommaRegex.test(text)) {
    text = text.replace(trailingCommaRegex, '$1');
    fixes.push('Removed trailing commas before closing braces/brackets');
  }

  // Step 8: Clean up leading plus signs on numbers (e.g. +42 -> 42)
  const plusNumberRegex = /:\s*\+(\d+)/g;
  if (plusNumberRegex.test(text)) {
    text = text.replace(plusNumberRegex, ': $1');
    fixes.push('Removed leading plus sign on numbers');
  }

  // Test if it parses now
  try {
    const parsed = JSON.parse(text);
    return {
      success: true,
      repairedText: JSON.stringify(parsed, null, 2),
      fixesApplied: fixes.length > 0 ? fixes : ['Formatted and validated JSON structure'],
      parsedData: parsed,
    };
  } catch (err: any) {
    // If simple fixes didn't completely solve it, try un-pretty raw repaired text
    return {
      success: false,
      repairedText: text,
      fixesApplied: fixes,
      error: `Partial fixes applied, but remaining error persists: ${err.message}`,
    };
  }
}

/**
 * Prettifies valid JSON
 */
export function formatJson(raw: string, indent: number = 2): { formatted: string; success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(raw);
    return {
      formatted: JSON.stringify(parsed, null, indent),
      success: true,
    };
  } catch (err: any) {
    return {
      formatted: raw,
      success: false,
      error: err.message,
    };
  }
}

/**
 * Minifies valid JSON
 */
export function minifyJson(raw: string): { minified: string; success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(raw);
    return {
      minified: JSON.stringify(parsed),
      success: true,
    };
  } catch (err: any) {
    return {
      minified: raw,
      success: false,
      error: err.message,
    };
  }
}
