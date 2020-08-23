/**
 * Wrapper for `ArrayBuffer`s with support for bit-level reads and writes.
 *
 * Similar to JavaScript's {@link https://developer.mozilla.org/en-US/docs/JavaScript/Typed_arrays/DataView | DataView}.
 */
export class BitView {
    /** Underlying buffer which this view accesses. */
    readonly buffer: Uint8Array;
    /** Length of this view (in bytes) from the start of its buffer. */
    readonly byteLength: number;
    /** Length of this view (in bits) from the start of its buffer. */
    readonly bitLength: number;

    constructor(buffer: Uint8Array, byteOffset: number = 0, byteLength: number = buffer.length - byteOffset) {
        this.buffer = (byteOffset === 0 && byteLength === buffer.length)
                ? buffer : buffer.subarray(byteOffset, byteOffset + byteLength);
        this.byteLength = byteLength;
        this.bitLength = byteLength * 8;
    }

    private checkBounds(offset: number, bits: number): void {
        const available = (this.bitLength - offset);

        if (bits > available)
            throw new Error('Cannot get/set ' + bits + ' bit(s) from offset ' + offset + ', ' + available + ' available');
    }

    /**
     * Returns the bit value at the specified bit offset.
     *
     * @param offset Offset of bit.
     */
    getBit(offset: number): 1 | 0 {
            return (this.buffer[offset >> 3] >> (7 - (offset & 0b111)) & 0b1) as (1 | 0);
    }

    /**
     * Returns a `bits` long value at the specified bit offset.
     *
     * @param offset Offset of bits.
     * @param bits Number of bits to read.
     * @param signed Whether the result should be a signed or unsigned value.
     */
    getBits(offset: number, bits: number, signed: boolean): number {
        this.checkBounds(offset, bits);

        const startBitOffset = offset & 0b111;
        const endBitOffset = 8 - ((offset + bits) & 0b111 || 8);

        const startByte = offset >> 3;
        const endByte = (offset + bits - 1) >> 3;

        let value = 0;
        let written = 0;
        for (let i = startByte; i <= endByte; i++) {
            let byte = this.buffer[i];
            let shift = 8;

            // Mask wanted bits from start byte
            if (i === startByte) {
                byte &= 0b11111111 >> startBitOffset;
                shift -= startBitOffset;
            }

            // Shift wanted bits from end byte
            if (i === endByte) {
                byte >>= endBitOffset;
                shift -= endBitOffset;
            }

            written += shift;

            // Shift existing bits (nothing to shift at start byte)
            if (i !== startByte) {
                if (written <= 32) value <<= shift;
                else value *= 2 ** shift;
            }

            // Add current byte
            if (written <= 32) value |= byte; else value += byte;
            // Convert back to unsigned if exactly 32 bits have been written
            if (!signed && written === 32) value >>>= 0;
        }

        if (signed) {
            // Read imaginary MSB and convert to signed if needed
            if (bits < 32 && value >> (bits - 1) > 0) {
                value |= -1 ^ ((1 << bits) - 1);
            } else if (bits > 32 && value > 2 ** (bits - 1)) {
                value -= 2 ** bits;
            }
        }

        return value;
    }

    /**
     * Writes the bit value at the specified bit offset.
     *
     * @param offset Offset of bit.
     * @param value Value to set.
     */
    setBit(offset: number, value: 1 | 0) {
        if (value === 1) this.buffer[offset >> 3] |= 0b10000000 >> (offset & 0b111);
        else this.buffer[offset >> 3] &= ~(0b10000000 >> (offset & 0b111));
    }

    /**
     * Writes a `bits` long value at the specified bit offset.
     *
     * @param offset Offset of bits.
     * @param value Value to set.
     * @param bits Number of bits to write.
     *
     * @remarks There is no difference between signed and unsigned values when storing.
     */
    setBits(offset: number, value: number, bits: number): void {
        this.checkBounds(offset, bits);

        const startBitOffset = offset & 0b111;
        const endBitOffset = 8 - ((offset + bits) & 0b111 || 8);

        const startByte = offset >> 3;
        const endByte = (offset + bits - 1) >> 3;

        for (let i = endByte; i >= startByte; i--) {
            let read = 8;
            let shift = 0;
            let mask = 0b11111111;

            // Mask write bits in start byte
            if (i === startByte) {
                read -= startBitOffset;
                mask &= 0b11111111 >> startBitOffset;
            }

            // Mask write bits in end byte
            if (i === endByte) {
                read -= endBitOffset;
                mask &= 0b11111111 << endBitOffset;
                shift = endBitOffset;
            }

            // Read required number of bits
            let byte: number;
            if (bits <= 32) {
                byte = value & (0b11111111 >> read);
                value >>= read;
            } else {
                const divisor = 2 ** read;
                byte = value % divisor;
                if (byte < 0) byte += divisor;
                value = (value - byte) / divisor;
            }
            bits -= read;

            // Write to buffer
            this.buffer[i] = (this.buffer[i] & ~mask) | (byte << shift);
        }
    }

    getBoolean = (offset: number) => this.getBit(offset) === 1;
    getInt8 = (offset: number) => this.getBits(offset, 8, true);
    getUint8 = (offset: number) => this.getBits(offset, 8, false);
    getInt16 = (offset: number) => this.getBits(offset, 16, true);
    getUint16 = (offset: number) => this.getBits(offset, 16, false);
    getInt32 = (offset: number) => this.getBits(offset, 32, true);
    getUint32 = (offset: number) => this.getBits(offset, 32, false);

    setBoolean = (offset: number, value: boolean) => this.setBit(offset, value ? 1 : 0);
    setInt8 = (offset: number, value: number) => this.setBits(offset, value, 8);
    setUint8 = (offset: number, value: number) => this.setBits(offset, value, 8);
    setInt16 = (offset: number, value: number) => this.setBits(offset, value, 16);
    setUint16 = (offset: number, value: number) => this.setBits(offset, value, 16);
    setInt32 = (offset: number, value: number) => this.setBits(offset, value, 32);
    setUint32 = (offset: number, value: number) => this.setBits(offset, value, 32);

    /**
     * Returns a buffer containing the bytes at the specified bit offset.
     *
     * @param offset Offset of bytes.
     * @param byteLength Number of bytes to read.
     */
    readBuffer(offset: number, byteLength: number): Uint8Array {
        const buffer = new Uint8Array(byteLength);
        for (let i = 0; i < byteLength; i++) buffer[i] = this.getUint8(offset + (i * 8));
        return buffer;
    }

    /**
     * Writes the contents of a buffer at the specified bit offset.
     *
     * @param offset Offset of bytes.
     * @param buffer Buffer to write.
     */
    writeBuffer(offset: number, buffer: Uint8Array): number {
        for (let i = 0; i < buffer.length; i++) this.setUint8(offset + (i * 8), buffer[i]);
        return buffer.length;
    }

    /**
     * Returns a string decoded from the bytes at the specified bit offset.
     *
     * @param offset Offset of bytes.
     * @param byteLength Number of bytes to read.
     * @param encoding Encoding to use for {@link TextDecoder}.
     */
    readString(offset: number, byteLength: number, encoding?: string): string {
        return new TextDecoder(encoding).decode(this.readBuffer(offset, byteLength));
    }

    /**
     * Writes UTF-8 encoded form of a string to the bytes at the specified bit offset.
     *
     * @param offset Offset of bytes.
     * @param string String to write.
     * @param byteLength Optional number of bytes to write.
     *
     * @returns The number of bytes written (may be different from the string length).
     *
     * @remarks If the encoded string length is less than `byteLength`, the remainder is filled with `0`s.
     * @remarks If the encoded string length is longer than `byteLength`, it is truncated.
     */
    writeString(offset: number, string: string, byteLength?: number): number {
        let buffer: Uint8Array;
        if (byteLength === undefined) {
            buffer = new TextEncoder().encode(string);
        } else {
            buffer = new Uint8Array(byteLength);
            new TextEncoder().encodeInto(string, buffer);
        }
        this.writeBuffer(offset, buffer);
        return buffer.length;
    }
}

/**
 * Wrapper for {@link BitView}s that maintains an index while reading/writing sequential data.
 */
export class BitStream {
    /** Underlying view which this stream accesses. */
    readonly view: BitView;
    /** Underlying buffer which this stream accesses. */
    readonly buffer: Uint8Array;
    /** Length of this stream (in bytes) from the start of its buffer. */
    readonly byteLength: number;
    /** Length of this stream (in bits) from the start of its buffer. */
    readonly bitLength: number;

    /** Current position of this stream (in bits) from/to which data is read/written. */
    bitIndex: number;

    /** Alias for {@link bitIndex} */
    get index() { return this.bitIndex; }
    set index(val) { this.bitIndex = val; };

    /** Number of bits remaining in this stream's underlying buffer from the current position. */
    get bitsLeft() { return this.bitLength - this.bitIndex; }

    /** Current position of this stream (in bytes) from/to which data is read/written. */
    get byteIndex() { return Math.ceil(this.bitIndex / 8); }
    set byteIndex(val) { this.bitIndex = val * 8; }

    constructor(source: BitView);
    constructor(source: Buffer, byteOffset?: number, byteLength?: number);
    constructor(source: BitView | Buffer, byteOffset?: number, byteLength?: number) {
        this.view = source instanceof BitView ? source : new BitView(source, byteOffset, byteLength);

        this.buffer = this.view.buffer;
        this.bitIndex = 0;
        this.bitLength = this.view.bitLength;
        this.byteLength = this.view.byteLength;
    }

    readBit(): 1 | 0 {
        const val = this.view.getBit(this.bitIndex);
        this.bitIndex++;
        return val;
    }

    readBits(bits: number, signed: boolean = false): number {
        const val = this.view.getBits(this.bitIndex, bits, signed);
        this.bitIndex += bits;
        return val;
    }

    writeBit(value: 1 | 0): void {
        this.view.setBit(this.bitIndex, value);
        this.bitIndex++;
    }

    writeBits(value: number, bits: number): void {
        this.view.setBits(this.bitIndex, value, bits);
        this.bitIndex += bits;
    }

    readBoolean = () => this.readBit() === 1;
    readInt8 = () => this.readBits(8, true);
    readUint8 = () => this.readBits(8, false);
    readInt16 = () => this.readBits(16, true);
    readUint16 = () => this.readBits(16, false);
    readInt32 = () => this.readBits(32, true);
    readUint32 = () => this.readBits(32, false);

    writeBoolean = (value: boolean) => this.writeBit(value ? 1 : 0);
    writeInt8 = (value: number) => this.writeBits(value, 8);
    writeUint8 = (value: number) => this.writeBits(value, 8);
    writeInt16 = (value: number) => this.writeBits(value, 16);
    writeUint16 = (value: number) => this.writeBits(value, 16);
    writeInt32 = (value: number) => this.writeBits(value, 32);
    writeUint32 = (value: number) => this.writeBits(value, 32);

    readBuffer(byteLength: number): Uint8Array {
        const buffer = this.view.readBuffer(this.bitIndex, byteLength);
        this.bitIndex += byteLength * 8;
        return buffer;
    }

    writeBuffer(buffer: Uint8Array): number {
        const length = this.view.writeBuffer(this.bitIndex, buffer);
        this.bitIndex += buffer.length * 8;
        return length;
    }

    readString(byteLength: number, encoding?: string): string {
        const string = this.view.readString(this.bitIndex, byteLength, encoding);
        this.bitIndex += byteLength * 8;
        return string;
    }

    writeString(string: string, byteLength?: number): number {
        const length = this.view.writeString(this.bitIndex, string, byteLength);
        this.bitIndex += length * 8;
        return length;
    }
}