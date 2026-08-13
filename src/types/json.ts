export type DataType = 'string' | 'number' | 'boolean' | 'null' | 'array' | 'object';

export type NodePath = (string | number)[];

export interface TypeDetectionResult {
  type: DataType;
  parsedValue: any;
  isInvalidJsonSyntax: boolean;
  warningMessage?: string;
  rawInput: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain?: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export type AppMode = 'local' | 'firebase';

export interface HistoryState {
  data: any;
  selectedPath: NodePath;
  timestamp: number;
}

export interface SearchMatch {
  path: NodePath;
  key: string;
  value: any;
  type: DataType;
  matchInKey: boolean;
  matchInValue: boolean;
}
