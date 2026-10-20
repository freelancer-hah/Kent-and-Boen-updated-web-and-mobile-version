declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(location: string, options?: any);
    close(): void;
    prepare(sql: string): StatementSync;
    exec(sql: string): void;
  }

  export class StatementSync {
    all(...params: any[]): any[];
    get(...params: any[]): any;
    run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
  }
}
