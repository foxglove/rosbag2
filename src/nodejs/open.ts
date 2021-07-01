import { FileHandle, open as fopen, readdir, readFile } from "fs/promises";
import path from "path";

import { Filelike, Rosbag2 } from "..";
import { SqliteNodejs } from "./SqliteNodejs";

export class Reader implements Filelike {
  static DEFAULT_BUFFER_SIZE = 1024 * 16;

  readonly filename: string;
  private size_?: number;
  private handle_?: FileHandle;
  private buffer_: Uint8Array;

  constructor(filename: string) {
    this.filename = filename;
    this.buffer_ = new Uint8Array(Reader.DEFAULT_BUFFER_SIZE);
  }

  async read(offset?: number, length?: number): Promise<Uint8Array> {
    const handle = this.handle_ ?? (await this.open());
    offset ??= 0;
    length ??= Math.max(0, (this.size_ ?? 0) - offset);

    if (length > this.buffer_.byteLength) {
      const newSize = Math.max(this.buffer_.byteLength * 2, length);
      this.buffer_ = new Uint8Array(newSize);
    }

    await handle.read(this.buffer_, 0, length, offset);
    return this.buffer_.byteLength === length
      ? this.buffer_
      : new Uint8Array(this.buffer_.buffer, 0, length);
  }

  async readAsText(): Promise<string> {
    return readFile(this.filename, { encoding: "utf8" });
  }

  async size(): Promise<number> {
    if (this.size_ != undefined) {
      return this.size_;
    }
    await this.open();
    return this.size_ ?? 0;
  }

  async close(): Promise<void> {
    if (this.handle_ == undefined) {
      return;
    }

    await this.handle_.close();
    this.size_ = undefined;
    this.handle_ = undefined;
  }

  private async open(): Promise<FileHandle> {
    this.handle_ = await fopen(this.filename, "r");
    this.size_ = (await this.handle_.stat()).size;
    return this.handle_;
  }
}

export async function open(folder: string): Promise<Rosbag2> {
  const filenames = await listFiles(folder, ".");
  const entries = filenames.map((filename) => ({
    relativePath: filename,
    file: new Reader(path.join(folder, filename)),
  }));
  const bag = new Rosbag2(
    folder,
    entries,
    (fileEntry) => new SqliteNodejs(path.join(folder, fileEntry.relativePath)),
  );
  await bag.open();
  return bag;
}

async function listFiles(baseDir: string, dirname: string): Promise<string[]> {
  let filenames: string[] = [];
  const fullPath = path.join(baseDir, dirname);
  const entries = await readdir(fullPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dirname, entry.name);
    if (entry.isFile()) {
      filenames.push(entryPath);
    } else if (entry.isDirectory()) {
      filenames = filenames.concat(await listFiles(baseDir, entryPath));
    }
  }
  return filenames;
}
