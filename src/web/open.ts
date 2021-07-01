import { Filelike, Rosbag2 } from "..";

export class Reader implements Filelike {
  private blob_: Blob;
  private size_: number;

  constructor(blob: Blob) {
    this.blob_ = blob;
    this.size_ = blob.size;
  }

  read(offset: number, length: number): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function () {
        reader.onload = null;
        reader.onerror = null;
        resolve(new Uint8Array(reader.result as ArrayBuffer));
      };
      reader.onerror = function () {
        reader.onload = null;
        reader.onerror = null;
        reject(reader.error ?? new Error(`Unknown FileReader error`));
      };
      reader.readAsArrayBuffer(this.blob_.slice(offset, offset + length));
    });
  }

  size(): Promise<number> {
    return Promise.resolve(this.size_);
  }
}

export async function open(folder: FileSystemDirectoryEntry): Promise<Rosbag2> {
  const files = await listFiles(folder);
  const entries = files.map((file) => ({
    relativePath: file.webkitRelativePath,
    file: new Reader(file),
  }));
  return new Rosbag2(folder.fullPath, entries);
}

async function listFiles(folder: FileSystemDirectoryEntry): Promise<File[]> {
  let files: File[] = [];

  const entries = await getFolderEntries(folder);
  for (const entry of entries) {
    if (entry.isDirectory) {
      files = files.concat(await listFiles(entry as FileSystemDirectoryEntry));
    } else if (entry.isFile) {
      files.push(await getFile(entry as FileSystemFileEntry));
    }
  }

  return files;
}

function getFolderEntries(folder: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => folder.createReader().readEntries(resolve, reject));
}

function getFile(fileEntry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => fileEntry.file(resolve, reject));
}
