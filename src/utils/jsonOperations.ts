import { DataType, NodePath, SearchMatch } from '../types/json';

// Prototype pollution guard
export function isUnsafeKey(key: string | number): boolean {
  const s = String(key);
  return s === '__proto__' || s === 'constructor' || s === 'prototype';
}

export function getType(val: any): DataType {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  const type = typeof val;
  if (type === 'string') return 'string';
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'object') return 'object';
  return 'string';
}

export function isPathEqual(p1: NodePath, p2: NodePath): boolean {
  if (p1.length !== p2.length) return false;
  return p1.every((segment, index) => String(segment) === String(p2[index]));
}

export function isPathAncestor(ancestor: NodePath, path: NodePath): boolean {
  if (ancestor.length >= path.length) return false;
  return ancestor.every((segment, index) => String(segment) === String(path[index]));
}

export function pathToString(path: NodePath): string {
  if (path.length === 0) return 'root';
  return 'root/' + path.join('/');
}

export function getValueByPath(data: any, path: NodePath): any {
  if (!path || path.length === 0) return data;
  let current = data;
  for (const segment of path) {
    if (isUnsafeKey(segment)) return undefined;
    if (current === undefined || current === null) return undefined;
    current = current[segment];
  }
  return current;
}

export function setValueByPath(data: any, path: NodePath, newValue: any): any {
  if (path.length === 0) return newValue;

  const clone = Array.isArray(data) ? [...data] : { ...data };
  const [head, ...tail] = path;

  if (isUnsafeKey(head)) return data;

  if (tail.length === 0) {
    if (Array.isArray(clone)) {
      const idx = Number(head);
      if (!isNaN(idx)) clone[idx] = newValue;
    } else {
      clone[head] = newValue;
    }
    return clone;
  }

  clone[head] = setValueByPath(clone[head] ?? {}, tail, newValue);
  return clone;
}

export function deleteValueByPath(data: any, path: NodePath): any {
  if (path.length === 0) return null;

  const [head, ...tail] = path;
  if (isUnsafeKey(head)) return data;

  if (tail.length === 0) {
    if (Array.isArray(data)) {
      const idx = Number(head);
      return data.filter((_, i) => i !== idx);
    } else if (data && typeof data === 'object') {
      const clone = { ...data };
      delete clone[head];
      return clone;
    }
    return data;
  }

  if (Array.isArray(data)) {
    const idx = Number(head);
    const clone = [...data];
    clone[idx] = deleteValueByPath(clone[idx], tail);
    return clone;
  } else if (data && typeof data === 'object') {
    const clone = { ...data };
    clone[head] = deleteValueByPath(clone[head], tail);
    return clone;
  }

  return data;
}

export function insertChildByPath(data: any, path: NodePath, key: string | number, value: any): any {
  if (isUnsafeKey(key)) return data;

  const target = getValueByPath(data, path);
  if (target === undefined || target === null) return data;

  let updatedTarget: any;

  if (Array.isArray(target)) {
    updatedTarget = [...target, value];
  } else if (typeof target === 'object') {
    updatedTarget = { ...target, [key]: value };
  } else {
    return data;
  }

  return setValueByPath(data, path, updatedTarget);
}

export function renameKeyByPath(data: any, parentPath: NodePath, oldKey: string, newKey: string): any {
  if (isUnsafeKey(oldKey) || isUnsafeKey(newKey)) return data;

  const parent = getValueByPath(data, parentPath);
  if (!parent || typeof parent !== 'object' || Array.isArray(parent)) return data;

  const updatedParent: any = {};
  for (const k of Object.keys(parent)) {
    if (k === oldKey) {
      updatedParent[newKey] = parent[oldKey];
    } else {
      updatedParent[k] = parent[k];
    }
  }

  return setValueByPath(data, parentPath, updatedParent);
}

export function searchJsonTree(data: any, query: string): SearchMatch[] {
  const matches: SearchMatch[] = [];
  if (!query.trim()) return matches;

  const q = query.toLowerCase();

  function walk(val: any, path: NodePath) {
    if (val === undefined) return;

    const currentKey = path.length > 0 ? String(path[path.length - 1]) : 'root';
    const matchInKey = currentKey.toLowerCase().includes(q);
    let matchInValue = false;

    const type = getType(val);

    if (type !== 'object' && type !== 'array') {
      const strVal = String(val).toLowerCase();
      if (strVal.includes(q)) {
        matchInValue = true;
      }
    }

    if (matchInKey || matchInValue) {
      matches.push({
        path,
        key: currentKey,
        value: val,
        type,
        matchInKey,
        matchInValue,
      });
    }

    if (type === 'object' && val !== null) {
      Object.keys(val).forEach(k => {
        if (!isUnsafeKey(k)) walk(val[k], [...path, k]);
      });
    } else if (type === 'array') {
      val.forEach((item: any, idx: number) => {
        walk(item, [...path, idx]);
      });
    }
  }

  walk(data, []);
  return matches;
}
