export interface RingBuffer<T> {
  capacity: number;
  data: T[];
  startIndex: number;
  size: number;
}

const ZERO = 0;
const ONE = 1;

export function createRingBuffer<T>(capacity: number): RingBuffer<T> {
  if (!Number.isInteger(capacity) || capacity < ZERO) {
    throw new Error("ring buffer capacity must be a non-negative integer");
  }

  return {
    capacity,
    data: [],
    startIndex: ZERO,
    size: ZERO
  };
}

export function pushRingBuffer<T>(buffer: RingBuffer<T>, value: T): RingBuffer<T> {
  if (buffer.capacity === ZERO) {
    return buffer;
  }

  if (buffer.size < buffer.capacity) {
    return {
      ...buffer,
      data: [...buffer.data, value],
      size: buffer.size + ONE
    };
  }

  const nextData = [...buffer.data];
  nextData[buffer.startIndex] = value;
  const nextStartIndex = (buffer.startIndex + ONE) % buffer.capacity;

  return {
    ...buffer,
    data: nextData,
    startIndex: nextStartIndex
  };
}

export function ringBufferToArray<T>(buffer: RingBuffer<T>): T[] {
  if (buffer.size === ZERO) {
    return [];
  }

  const values: T[] = [];
  for (let index = ZERO; index < buffer.size; index += ONE) {
    const normalizedIndex = (buffer.startIndex + index) % buffer.capacity;
    values.push(buffer.data[normalizedIndex]);
  }
  return values;
}

