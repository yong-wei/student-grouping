declare module 'fs' {
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function appendFileSync(path: string, data: string, options?: string): void;
  export function writeFileSync(path: string, data: string, options?: string): void;
}

declare module 'path' {
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const process: {
  cwd(): string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const console: {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};

export {};
