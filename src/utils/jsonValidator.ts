/**
 * Advanced JSON Validator, Error Pinpointer, and Auto-Repair Utility
 * Adheres to Ponytail principles: lean, robust, minimal footprint, standard algorithms.
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
  | 'bareword_value'
  | 'missing_value'
  | 'syntax_error';

export interface ExactFixInfo {
  action: string;
  tokenToInsert?: string;
  insertPosition?: number;
  description: string;
}

export interface JsonErrorInfo {
  title: string;
  message: string;
  rawMessage: string;
  category: JsonErrorCategory;
  suggestion: string;
  location: JsonErrorLocation;
  autoFixable: boolean;
  exactFix?: ExactFixInfo;
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
export function getLocationFromPosition(text: string, position: number): JsonErrorLocation {
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
      const indicator = ' '.repeat(padLen) + '^-- Error location';
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
    if (!isNaN(pos)) return Math.min(pos, text.length);
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
      return Math.min(p + (c - 1), text.length);
    }
  }

  // Fallback: heuristic scan to find first suspicious character
  return findFirstErrorPositionHeuristic(text);
}

/**
 * Computes unclosed brackets stack to pinpoint missing closing braces / brackets
 */
export function getUnclosedBracketStack(text: string): string[] {
  const stack: string[] = [];
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === '\\') {
        isEscaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') {
      stack.push('}');
    } else if (ch === '[') {
      stack.push(']');
    } else if (ch === '}' || ch === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop();
      }
    }
  }

  return stack;
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

  return Math.max(0, text.length);
}

/**
 * Categorizes the error and generates specific actionable instructions and exact fix metadata
 */
function categorizeError(text: string, location: JsonErrorLocation, rawErrorMsg: string): {
  title: string;
  message: string;
  category: JsonErrorCategory;
  suggestion: string;
  autoFixable: boolean;
  exactFix?: ExactFixInfo;
} {
  const { lineContent, position, column } = location;
  const beforePos = text.slice(Math.max(0, position - 50), position);
  const afterPos = text.slice(position, Math.min(text.length, position + 50));
  const snippetAround = beforePos + afterPos;
  const lowerMsg = rawErrorMsg.toLowerCase();

  // 1. Unclosed Brackets / Unexpected End of JSON
  const unclosedStack = getUnclosedBracketStack(text);
  if (
    unclosedStack.length > 0 &&
    (lowerMsg.includes('unexpected end') || lowerMsg.includes('bracket') || lowerMsg.includes('brace') || position >= text.length - 2)
  ) {
    const missingTokens = [...unclosedStack].reverse();
    const tokenStr = missingTokens.join(' ');
    const insertCode = '\n' + missingTokens.join('\n');
    return {
      title: 'Missing Closing Bracket / Brace',
      message: `Missing ${missingTokens.length} closing token(s): "${tokenStr}" at the end of the JSON (opened earlier in file).`,
      category: 'unclosed_bracket',
      suggestion: `Add ${tokenStr} at the end of the JSON to close all open blocks.`,
      autoFixable: true,
      exactFix: {
        action: `Insert missing ${tokenStr}`,
        tokenToInsert: insertCode,
        insertPosition: text.length,
        description: `Add ${tokenStr} at the end of Line ${location.line}`,
      },
    };
  }

  // 2. Trailing Comma Check
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
      exactFix: {
        action: 'Remove trailing comma',
        description: `Delete extra comma at Line ${location.line}, Col ${location.column}`,
      },
    };
  }

  // 3. Single Quotes or Smart Quotes Check
  if (/'|[“”‘’`]/.test(lineContent) || /'|[“”‘’`]/.test(snippetAround)) {
    return {
      title: 'Single or Curly Quotes Used',
      message: `JSON requires double quotes (""), but single quotes (') or smart quotes were detected at Line ${location.line}.`,
      category: 'single_quotes',
      suggestion: 'Replace single/smart quotes with standard double quotes (").',
      autoFixable: true,
      exactFix: {
        action: 'Convert to double quotes',
        description: `Replace quotes on Line ${location.line} with standard double quotes (")`,
      },
    };
  }

  // 4. Comments in JSON
  if (/\/\/|\/\*/.test(snippetAround) || /\/\/|\/\*/.test(lineContent)) {
    return {
      title: 'Comment in JSON',
      message: `Standard JSON does not allow comments (found at Line ${location.line}).`,
      category: 'comment',
      suggestion: 'Remove comments (// or /* */) from JSON.',
      autoFixable: true,
      exactFix: {
        action: 'Strip comments',
        description: `Remove comments near Line ${location.line}`,
      },
    };
  }

  // 5. Python / JS Literals (True, False, None, undefined, NaN)
  if (/\b(True|False|None|undefined|NaN)\b/.test(lineContent) || /\b(True|False|None|undefined|NaN)\b/.test(snippetAround)) {
    return {
      title: 'Invalid Literal Used',
      message: `Non-JSON literal (True, False, None, undefined, NaN) detected near Line ${location.line}.`,
      category: 'python_literal',
      suggestion: 'Replace with valid JSON keywords: true, false, or null.',
      autoFixable: true,
      exactFix: {
        action: 'Convert literal to JSON',
        description: `Change to lowercase true/false/null at Line ${location.line}`,
      },
    };
  }

  // 6. Missing Colon
  if (
    /("[^"]+"|'[^']+'|[a-zA-Z0-9_$]+)\s+("[^"]+"|'[^']+'|[0-9]+|true|false|null|{|\[)/.test(lineContent)
  ) {
    return {
      title: 'Missing Colon',
      message: `Missing colon (:) between property key and value at Line ${location.line}, Column ${location.column}.`,
      category: 'missing_colon',
      suggestion: 'Add a colon (:) between the key and its value, e.g. "key": "value".',
      autoFixable: true,
      exactFix: {
        action: 'Insert colon (:)',
        tokenToInsert: ': ',
        insertPosition: position,
        description: `Add colon (:) after key on Line ${location.line}`,
      },
    };
  }

  // 7. Missing Comma
  if (
    /("[^"]+"|'[^']+'|\d+|true|false|null|}|\])\s+("[^"]+"|'[^']+'|[a-zA-Z0-9_$]+|\d+|true|false|null|{|\[)/.test(lineContent) ||
    lowerMsg.includes('expected') ||
    lowerMsg.includes('comma') ||
    lowerMsg.includes('after property')
  ) {
    return {
      title: 'Missing Comma',
      message: `Missing comma (,) separating elements or properties at Line ${location.line}, Column ${location.column}.`,
      category: 'missing_comma',
      suggestion: `Add a comma (,) after the item on or before Line ${location.line}.`,
      autoFixable: true,
      exactFix: {
        action: 'Insert comma (,)',
        tokenToInsert: ',',
        insertPosition: position,
        description: `Add comma (,) at Line ${location.line}, Col ${location.column}`,
      },
    };
  }

  // 8. Unquoted Keys in Object
  if (
    /([{,]\s*|\n\s*)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/.test(lineContent) ||
    /([{,]\s*|\n\s*)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/.test(snippetAround)
  ) {
    return {
      title: 'Unquoted Property Key',
      message: `Property key is missing enclosing double quotes at Line ${location.line}, Column ${location.column}.`,
      category: 'unquoted_key',
      suggestion: 'Wrap object keys in double quotes, e.g. "key": "value".',
      autoFixable: true,
      exactFix: {
        action: 'Wrap key in double quotes',
        description: `Add double quotes around key at Line ${location.line}`,
      },
    };
  }

  // 9. Unclosed String
  if (lowerMsg.includes('string') || lowerMsg.includes('unterminated')) {
    return {
      title: 'Unclosed String Literal',
      message: `String is not closed with a matching quotation mark at Line ${location.line}.`,
      category: 'unclosed_string',
      suggestion: 'Add a closing double quotation mark (") to terminate the string.',
      autoFixable: true,
      exactFix: {
        action: 'Insert closing quote (")',
        tokenToInsert: '"',
        insertPosition: position,
        description: `Add closing quote (") at Line ${location.line}`,
      },
    };
  }

  // 10. General Syntax Error
  return {
    title: 'Syntax Error',
    message: `Invalid JSON syntax at Line ${location.line}, Column ${location.column}: ${rawErrorMsg}`,
    category: 'syntax_error',
    suggestion: 'Inspect the highlighted position and ensure standard JSON syntax, or click Auto-Fix.',
    autoFixable: true,
  };
}

/**
 * Validates a JSON string and provides comprehensive error diagnostics with exact location and pinpoint fix
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
        autoFixable: true,
        exactFix: {
          action: 'Insert empty object {}',
          tokenToInsert: '{\n  \n}',
          insertPosition: 0,
          description: 'Initialize with empty object {}',
        },
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
        exactFix: cat.exactFix,
      },
    };
  }
}

/**
 * Intelligent Auto-Repair engine for JSON mistakes.
 * Auto-inserts missing closing brackets, commas, colons, quotes, root braces, and repairs syntax.
 */
export function autoRepairJson(raw: string): AutoRepairResult {
  if (!raw || !raw.trim()) {
    return {
      success: true,
      repairedText: '{\n  \n}',
      fixesApplied: ['Initialized with empty object {}'],
      parsedData: {},
    };
  }

  let text = raw.trim();
  const fixes: string[] = [];

  // Pass 0: Wrap bare key-value pairs in root curly braces { } if user entered properties without root
  if (!text.startsWith('{') && !text.startsWith('[') && /["'a-zA-Z0-9_$]\s*:\s*/.test(text)) {
    text = `{\n${text}\n}`;
    fixes.push('Wrapped bare key-value pairs in root curly braces { }');
  }

  // Multi-pass repair loop (up to 4 passes to resolve cascaded syntax errors)
  for (let pass = 0; pass < 4; pass++) {
    const prevText = text;

    // 1. Normalize smart/curly quotes and backticks
    if (/[“”‘’`]/.test(text)) {
      text = text
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/`([^`]*)`/g, '"$1"');
      fixes.push('Normalized smart quotes and backticks to standard quotes');
    }

    // 2. Strip comments (// ... and /* ... */)
    const commentRegex = /\/\*[\s\S]*?\*\/|([^:\\]|^)\/\/.*$/gm;
    if (commentRegex.test(text)) {
      text = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
      fixes.push('Removed comments');
    }

    // 3. Replace Python literals and JS undefined / NaN
    if (/\b(True|False|None|undefined|NaN)\b/.test(text)) {
      text = text
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\bNone\b/g, 'null')
        .replace(/\bundefined\b/g, 'null')
        .replace(/\bNaN\b/g, 'null');
      fixes.push('Converted Python/JS literals (True, False, None, undefined, NaN) to valid JSON');
    }

    // 4. Convert single-quoted strings & keys to double quotes
    const singleQuoteRegex = /'((?:\\.|[^'\\])*)'/g;
    if (singleQuoteRegex.test(text)) {
      text = text.replace(singleQuoteRegex, (_, content) => {
        const escaped = content.replace(/\\'/g, "'").replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      fixes.push('Converted single quotes to double quotes');
    }

    // 5. Wrap unquoted object keys in double quotes
    // Matches { key: or , key: or \n key:
    const unquotedKeyRegex = /([{,]\s*|\n\s*)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/g;
    if (unquotedKeyRegex.test(text)) {
      text = text.replace(unquotedKeyRegex, '$1"$2":');
      fixes.push('Wrapped unquoted object keys in double quotes');
    }

    // 6. Auto-insert missing commas between lines / adjacent items
    const rawLines = text.split('\n');
    let commaInserted = false;
    for (let i = 0; i < rawLines.length - 1; i++) {
      const currentLine = rawLines[i].trim();
      const nextLine = rawLines[i + 1].trim();

      if (!currentLine || !nextLine) continue;
      if (/[,{\[:]$/.test(currentLine)) continue;
      if (/^[}\]]/.test(nextLine)) continue;

      const isCurrentValue = /("(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?|true|false|null|\}|\])$/.test(currentLine);
      const isNextPropertyOrItem = /^("(?:\\.|[^"\\])*"|[a-zA-Z0-9_$]+)\s*:|^("(?:\\.|[^"\\])*"|-?\d+|true|false|null|\{|\[)/.test(nextLine);

      if (isCurrentValue && isNextPropertyOrItem) {
        rawLines[i] = rawLines[i] + ',';
        commaInserted = true;
      }
    }
    if (commaInserted) {
      text = rawLines.join('\n');
      fixes.push('Inserted missing commas (,) between lines');
    }

    // 7. Fix missing colons between keys and values (e.g. "key" "value" or "key" 123)
    const missingColonRegex = /("(?:\\.|[^"\\])*"|[a-zA-Z_$][a-zA-Z0-9_$-]*)\s+("(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?|true|false|null|\{|\[)(?!:)/g;
    if (missingColonRegex.test(text)) {
      text = text.replace(missingColonRegex, '$1: $2');
      fixes.push('Inserted missing colons (:) after keys');
    }

    // 8. Auto-close unclosed strings on single lines
    const lines = text.split('\n');
    let stringFixed = false;
    for (let i = 0; i < lines.length; i++) {
      let inStr = false;
      let esc = false;
      for (let j = 0; j < lines[i].length; j++) {
        const ch = lines[i][j];
        if (esc) {
          esc = false;
        } else if (ch === '\\') {
          esc = true;
        } else if (ch === '"') {
          inStr = !inStr;
        }
      }
      if (inStr) {
        lines[i] = lines[i] + '"';
        stringFixed = true;
      }
    }
    if (stringFixed) {
      text = lines.join('\n');
      fixes.push('Auto-closed unclosed string literals with closing quote (")');
    }

    // 9. Auto-insert null for missing values (e.g. "key": , or "key": })
    const missingValueRegex = /(:\s*)([,\}\]])/g;
    if (missingValueRegex.test(text)) {
      text = text.replace(missingValueRegex, '$1null$2');
      fixes.push('Inserted null for missing values');
    }

    // 10. Remove trailing commas before } or ]
    const trailingCommaRegex = /,\s*([\}\]])/g;
    if (trailingCommaRegex.test(text)) {
      text = text.replace(trailingCommaRegex, '$1');
      fixes.push('Removed trailing commas before closing braces/brackets');
    }

    // 11. Wrap unquoted barewords in values (e.g. "status": active,)
    const barewordValueRegex = /(:\s*)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*([,\}\]\n])/g;
    if (barewordValueRegex.test(text)) {
      text = text.replace(barewordValueRegex, (match, prefix, word, suffix) => {
        if (['true', 'false', 'null'].includes(word.toLowerCase())) {
          return `${prefix}${word.toLowerCase()}${suffix}`;
        }
        return `${prefix}"${word}"${suffix}`;
      });
      fixes.push('Wrapped unquoted string values in double quotes');
    }

    // 12. Auto-close missing braces and brackets ({ [ vs } ])
    const openStack = getUnclosedBracketStack(text);
    if (openStack.length > 0) {
      const closingChars = [...openStack].reverse().join('\n');
      text = text.trimEnd() + '\n' + closingChars;
      fixes.push(`Auto-closed ${openStack.length} missing bracket/brace: ${closingChars.replace(/\n/g, ' ')}`);
    }

    // Remove any trailing commas exposed by adding closing brackets
    text = text.replace(/,\s*([\}\]])/g, '$1');

    // Check if JSON.parse succeeds
    try {
      const parsed = JSON.parse(text);
      const uniqueFixes = Array.from(new Set(fixes));
      return {
        success: true,
        repairedText: JSON.stringify(parsed, null, 2),
        fixesApplied: uniqueFixes.length > 0 ? uniqueFixes : ['Formatted and validated JSON'],
        parsedData: parsed,
      };
    } catch {
      if (text === prevText) break;
    }
  }

  // Final check
  try {
    const parsed = JSON.parse(text);
    const uniqueFixes = Array.from(new Set(fixes));
    return {
      success: true,
      repairedText: JSON.stringify(parsed, null, 2),
      fixesApplied: uniqueFixes.length > 0 ? uniqueFixes : ['Repaired JSON structure'],
      parsedData: parsed,
    };
  } catch (err: any) {
    const uniqueFixes = Array.from(new Set(fixes));
    return {
      success: false,
      repairedText: text,
      fixesApplied: uniqueFixes,
      error: `Could not fully auto-fix: ${err.message}`,
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
