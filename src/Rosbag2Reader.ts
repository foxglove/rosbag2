import { Filelike } from "./types";

export class Rosbag2Reader {
  files: Map<string, Filelike>;

  constructor(files: Map<string, Filelike>) {
    this.files = files;

    const metadataFile = files.get("metadata.yaml");
    if (metadataFile == undefined) {
      throw new Error(`Cannot construct Rosbag2Reader without metadata.yaml`);
    }
  }
}
