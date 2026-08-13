import { DataType, NodePath, SearchMatch } from '../types/json';

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
    if (current === undefined || current === null) return undefined;
    current = current[segment];
  }
  return current;
}

export function setValueByPath(data: any, path: NodePath, newValue: any): any {
  if (path.length === 0) return newValue;

  const clone = Array.isArray(data) ? [...data] : { ...data };
  const [head, ...tail] = path;

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
  const target = getValueByPath(data, path);
  if (target === undefined || target === null) return data;

  let updatedTarget: any;

  if (Array.isArray(target)) {
    updatedTarget = [...target, value];
  } else if (typeof target === 'object') {
    // Preserve existing keys and append new key
    updatedTarget = { ...target, [key]: value };
  } else {
    // Target is a primitive; convert to object containing new key
    updatedTarget = { [key]: value };
  }

  return setValueByPath(data, path, updatedTarget);
}

export function renameKeyByPath(data: any, parentPath: NodePath, oldKey: string, newKey: string): any {
  if (oldKey === newKey) return data;
  const target = getValueByPath(data, parentPath);

  if (!target || typeof target !== 'object' || Array.isArray(target)) return data;

  // Reconstruct object maintaining original key insertion order
  const updatedTarget: Record<string, any> = {};
  for (const k of Object.keys(target)) {
    if (k === oldKey) {
      updatedTarget[newKey] = target[oldKey];
    } else {
      updatedTarget[k] = target[k];
    }
  }

  return setValueByPath(data, parentPath, updatedTarget);
}

export function searchJsonTree(data: any, query: string, currentPath: NodePath = []): SearchMatch[] {
  if (!query || query.trim() === '') return [];

  const matches: SearchMatch[] = [];
  const q = query.toLowerCase().trim();

  function walk(val: any, path: NodePath, keyName: string) {
    const valType = getType(val);
    const matchInKey = keyName.toLowerCase().includes(q);

    let matchInValue = false;
    if (valType === 'string' || valType === 'number' || valType === 'boolean') {
      matchInValue = String(val).toLowerCase().includes(q);
    }

    if (matchInKey || matchInValue) {
      matches.push({
        path,
        key: keyName || 'root',
        value: val,
        type: valType,
        matchInKey,
        matchInValue,
      });
    }

    if (valType === 'object' && val !== null) {
      for (const k of Object.keys(val)) {
        walk(val[k], [...path, k], k);
      }
    } else if (valType === 'array') {
      val.forEach((item: any, idx: number) => {
        walk(item, [...path, idx], String(idx));
      });
    }
  }

  const rootType = getType(data);
  if (rootType === 'object' && data !== null) {
    for (const k of Object.keys(data)) {
      walk(data[k], [k], k);
    }
  } else if (rootType === 'array') {
    data.forEach((item: any, idx: number) => {
      walk(item, [idx], String(idx));
    });
  } else {
    walk(data, [], 'root');
  }

  return matches;
}
