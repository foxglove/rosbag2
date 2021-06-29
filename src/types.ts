export interface Callback<T> {
  (err: Error, result?: null): void;
  (err: undefined | null, result: T): void;
}

export interface Filelike {
  read(offset: number, length: number, callback: Callback<Buffer>): void;
  size(): number;
}
