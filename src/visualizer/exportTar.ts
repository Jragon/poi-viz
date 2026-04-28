const TAR_BLOCK_SIZE = 512;
const TAR_ZERO_BLOCK_COUNT = 2;

export interface ArchiveSink {
  writeFile: (path: string, body: Blob | Uint8Array) => Promise<void>;
  finalize: () => Promise<Blob>;
  discard: () => void;
}

export interface TarArchiveSinkOptions {
  readonly now?: () => Date;
}

type SinkState = "open" | "finalized" | "discarded";

const textEncoder = new TextEncoder();

function assertSafeTarPath(path: string) {
  if (path.length === 0) {
    throw new Error("Tar path must not be empty");
  }

  if (path.startsWith("/")) {
    throw new Error(`Tar path must be relative: ${path}`);
  }

  if (path.includes("\\")) {
    throw new Error(`Tar path must use forward slashes: ${path}`);
  }

  if (path.split("/").some((part) => part === ".." || part.length === 0)) {
    throw new Error(`Tar path contains an unsafe segment: ${path}`);
  }

  for (const char of path) {
    if (char.charCodeAt(0) > 0x7f) {
      throw new Error(`Tar path must contain ASCII characters only: ${path}`);
    }
  }

  if (textEncoder.encode(path).length > 100) {
    throw new Error(`Tar path exceeds the V1 path length limit: ${path}`);
  }
}

function writeString(target: Uint8Array, offset: number, length: number, value: string) {
  const encoded = textEncoder.encode(value);
  if (encoded.length > length) {
    throw new Error(`Tar field is too long: ${value}`);
  }

  target.set(encoded, offset);
}

function writeOctal(target: Uint8Array, offset: number, length: number, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Tar numeric field must be a non-negative integer: ${value}`);
  }

  const text = value.toString(8);
  if (text.length > length - 1) {
    throw new Error(`Tar numeric field is too large: ${value}`);
  }

  writeString(target, offset, length - 1, text.padStart(length - 1, "0"));
}

function writeChecksum(target: Uint8Array, checksum: number) {
  const text = checksum.toString(8);
  if (text.length > 6) {
    throw new Error(`Tar checksum field is too large: ${checksum}`);
  }

  writeString(target, 148, 6, text.padStart(6, "0"));
  target[154] = 0;
  target[155] = 0x20;
}

function createHeader(path: string, size: number, mtimeSeconds: number): Uint8Array {
  assertSafeTarPath(path);

  const header = new Uint8Array(TAR_BLOCK_SIZE);
  writeString(header, 0, 100, path);
  writeOctal(header, 100, 8, 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, size);
  writeOctal(header, 136, 12, mtimeSeconds);
  header.fill(0x20, 148, 156);
  header[156] = "0".charCodeAt(0);
  writeString(header, 257, 6, "ustar\0");
  writeString(header, 263, 2, "00");

  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  writeChecksum(header, checksum);

  return header;
}

function createPadding(size: number): Uint8Array | null {
  const remainder = size % TAR_BLOCK_SIZE;
  if (remainder === 0) {
    return null;
  }

  return new Uint8Array(TAR_BLOCK_SIZE - remainder);
}

async function toBytes(body: Blob | Uint8Array): Promise<Uint8Array> {
  if (body instanceof Uint8Array) {
    return body;
  }

  return new Uint8Array(await body.arrayBuffer());
}

function toBlobPart(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export class TarArchiveSink implements ArchiveSink {
  private readonly chunks: Uint8Array[] = [];
  private readonly now: () => Date;
  private state: SinkState = "open";

  constructor(options: TarArchiveSinkOptions = {}) {
    this.now = options.now ?? (() => new Date());
  }

  async writeFile(path: string, body: Blob | Uint8Array): Promise<void> {
    this.assertOpen();

    const bytes = await toBytes(body);
    const mtimeSeconds = Math.floor(this.now().getTime() / 1000);
    this.chunks.push(createHeader(path, bytes.byteLength, mtimeSeconds), bytes);

    const padding = createPadding(bytes.byteLength);
    if (padding) {
      this.chunks.push(padding);
    }
  }

  async finalize(): Promise<Blob> {
    this.assertOpen();
    this.state = "finalized";

    return new Blob(
      [
        ...this.chunks.map(toBlobPart),
        ...Array.from({ length: TAR_ZERO_BLOCK_COUNT }, () =>
          toBlobPart(new Uint8Array(TAR_BLOCK_SIZE))
        )
      ],
      { type: "application/x-tar" }
    );
  }

  discard() {
    if (this.state !== "open") {
      return;
    }

    this.chunks.length = 0;
    this.state = "discarded";
  }

  private assertOpen() {
    if (this.state !== "open") {
      throw new Error(`Tar archive is already ${this.state}`);
    }
  }
}
