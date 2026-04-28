import { describe, expect, it } from "vitest";

import { TarArchiveSink } from "@/visualizer/exportTar";

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

function readString(bytes: Uint8Array, offset: number, length: number): string {
  const field = bytes.slice(offset, offset + length);
  const end = field.indexOf(0);
  return textDecoder.decode(end === -1 ? field : field.slice(0, end));
}

function readOctal(bytes: Uint8Array, offset: number, length: number): number {
  const value = readString(bytes, offset, length).trim();
  return parseInt(value, 8);
}

function computeChecksum(header: Uint8Array): number {
  const copy = header.slice();
  copy.fill(0x20, 148, 156);
  return copy.reduce((sum, byte) => sum + byte, 0);
}

describe("TarArchiveSink", () => {
  it("writes valid ustar entries with padding and end blocks", async () => {
    const sink = new TarArchiveSink({ now: () => new Date("2026-04-28T12:00:00Z") });
    await sink.writeFile("frames/frame_00000.png", textEncoder.encode("png"));

    const bytes = await blobToBytes(await sink.finalize());
    const header = bytes.slice(0, 512);

    expect(bytes.byteLength).toBe(2048);
    expect(readString(header, 0, 100)).toBe("frames/frame_00000.png");
    expect(readOctal(header, 124, 12)).toBe(3);
    expect(readOctal(header, 136, 12)).toBe(
      Math.floor(new Date("2026-04-28T12:00:00Z").getTime() / 1000)
    );
    expect(String.fromCharCode(header[156])).toBe("0");
    expect(readString(header, 257, 6)).toBe("ustar");
    expect(readString(header, 263, 2)).toBe("00");
    expect(readOctal(header, 148, 8)).toBe(computeChecksum(header));
    expect(textDecoder.decode(bytes.slice(512, 515))).toBe("png");
    expect(Array.from(bytes.slice(515, 1024)).every((byte) => byte === 0)).toBe(true);
    expect(Array.from(bytes.slice(1024)).every((byte) => byte === 0)).toBe(true);
  });

  it("rejects writes after finalize or discard", async () => {
    const finalized = new TarArchiveSink();
    await finalized.writeFile("manifest.json", textEncoder.encode("{}"));
    await finalized.finalize();
    await expect(finalized.writeFile("frames/frame_00000.png", new Uint8Array())).rejects.toThrow(
      "already finalized"
    );

    const discarded = new TarArchiveSink();
    discarded.discard();
    await expect(discarded.writeFile("manifest.json", new Uint8Array())).rejects.toThrow(
      "already discarded"
    );
  });

  it("rejects unsafe paths", async () => {
    const unsafePaths = [
      "",
      "/frames/frame_00000.png",
      "frames/../frame_00000.png",
      "frames\\frame_00000.png",
      "frames//frame_00000.png",
      "frames/fráme_00000.png"
    ];

    for (const path of unsafePaths) {
      const sink = new TarArchiveSink();
      await expect(sink.writeFile(path, new Uint8Array())).rejects.toThrow();
    }
  });
});
