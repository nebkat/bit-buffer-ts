export class BitView {
    readonly buffer: Buffer;
    readonly bitLength: number;
    readonly byteLength: number;

    constructor(source: Buffer, private byteStart: number = 0, readonly byteEnd: number = source.length) {
        this.buffer = (byteStart === 0 && byteEnd === source.length) ? source : source.slice(byteStart, byteEnd);
        this.byteLength = this.buffer.length;
        this.bitLength = this.byteLength * 8;
    }

    private checkBounds(offset: number, bits: number) {
        const available = (this.bitLength - offset);

        if (bits > available)
            throw new Error('Cannot get/set ' + bits + ' bit(s) from offset ' + offset + ', ' + available + ' available');
    }

    getBit(offset: number): boolean {
        return (this.buffer[offset >> 3] >> (7 - (offset & 0b111)) & 0b1) > 0;
    }

    getBits(offset: number, bits: number, signed: boolean) {
        this.checkBounds(offset, bits);

        const startBitOffset = offset & 0b111;
        const startBits = 8 - startBitOffset;
        const endBits = (offset + bits) & 0b111 || 8;
        const endBitOffset = 8 - endBits;

        const startByte = offset >> 3;
        const endByte = (offset + bits - 1) >> 3;

        let big = 0;
        let written = 0;
        for (let i = startByte; i <= endByte; i++) {
            let byte = this.buffer[i];
            let shift = 8;

            // Mask wanted bits from start byte
            if (i === startByte) {
                byte &= ~(~0 << startBits);
                written += startBits;
            }
            // Shift wanted bits from end byte
            if (i === endByte) {
                byte >>= endBitOffset;
                shift = endBits;
            }

            // Shift existing bits
            if (i !== startByte) {
                written += shift;
                if (written <= 32) big <<= shift; else big *= 2 ** shift;
            }

            // Add current byte
            if (written <= 32) big |= byte; else big += byte;
            // Convert back to unsigned once 32 bits have been written
            if (!signed && written === 32) big >>>= 0;
        }

        if (signed) {
            // If we're not working with a full 32 bits, check the
            // imaginary MSB for this bit count and convert to a
            // valid 32-bit signed value if set.
            if (bits < 32 && big >> (bits - 1) > 0) {
                big |= -1 ^ ((1 << bits) - 1);
            } else if (bits > 32 && big > 2 ** (bits - 1)) {
                big -= 2 ** bits;
            }

            return big;
        }

        return big;
    }

    setBit(offset: number, value: boolean) {
        if (value) this.buffer[offset >> 3] |= 0b10000000 >> (offset & 0b111);
        else this.buffer[offset >> 3] &= ~(0b10000000 >> (offset & 0b111));
    }

    setBits(offset: number, value: number, bits: number) {
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
                byte = value & ~(~0 << read);
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

    getBoolean = this.getBit;
    getInt8 = (offset: number) => this.getBits(offset, 8, true);
    getUint8 = (offset: number) => this.getBits(offset, 8, false);
    getInt16 = (offset: number) => this.getBits(offset, 16, true);
    getUint16 = (offset: number) => this.getBits(offset, 16, false);
    getInt32 = (offset: number) => this.getBits(offset, 32, true);
    getUint32 = (offset: number) => this.getBits(offset, 32, false);

    setBoolean = this.setBit;
    setInt8 = (offset: number, value: number) => this.setBits(offset, value, 8);
    setUint8 = (offset: number, value: number) => this.setBits(offset, value, 8);
    setInt16 = (offset: number, value: number) => this.setBits(offset, value, 16);
    setUint16 = (offset: number, value: number) => this.setBits(offset, value, 16);
    setInt32 = (offset: number, value: number) => this.setBits(offset, value, 32);
    setUint32 = (offset: number, value: number) => this.setBits(offset, value, 32);

    getBuffer(offset: number, byteLength: number): Buffer {
        const buffer = Buffer.allocUnsafe(byteLength);
        for (let i = 0; i < byteLength; i++) buffer[i] = this.getUint8(offset + (i * 8));
        return buffer;
    }

    writeBuffer(offset: number, buffer: Buffer): void {
        for (let i = 0; i < buffer.length; i++) this.setUint8(offset + (i * 8), buffer[i]);
    }

    getString(offset: number, byteLength: number, encoding?: BufferEncoding): string {
        return this.getBuffer(offset, byteLength).toString(encoding);
    }

    writeString(offset: number, string: string, byteLength: number = string.length, encoding?: BufferEncoding) {
        const buffer = Buffer.alloc(byteLength);
        buffer.write(string, encoding);
        this.writeBuffer(offset, buffer);
    }
}


export class BitStream {
    readonly view: BitView;
    readonly buffer: Buffer;

    bitIndex: number;
    readonly bitLength: number;
    readonly byteLength: number;

    constructor(source: BitView);
    constructor(source: Buffer, byteStart?: number, byteEnd?: number);
    constructor(source: BitView | Buffer, byteStart?: number, byteEnd?: number) {
        this.view = source instanceof BitView ? source : new BitView(source, byteStart, byteEnd);

        this.buffer = this.view.buffer;
        this.bitIndex = 0;
        this.bitLength = this.view.bitLength;
        this.byteLength = this.view.byteLength;
    }

    get index() { return this.bitIndex; }
    set index(val) { this.bitIndex = val; };

    get bitsLeft() { return this.bitLength - this.bitIndex; }

    get byteIndex() { return Math.ceil(this.bitIndex / 8); }
    set byteIndex(val) { this.bitIndex = val * 8; }

    readBit() {
        const val = this.view.getBit(this.bitIndex);
        this.bitIndex++;
        return val;
    }

    readBits(bits: number, signed: boolean = false) {
        const val = this.view.getBits(this.bitIndex, bits, signed);
        this.bitIndex += bits;
        return val;
    }

    writeBit(value: boolean) {
        this.view.setBit(this.bitIndex, value);
        this.bitIndex++;
    }

    writeBits(value: number, bits: number) {
        this.view.setBits(this.bitIndex, value, bits);
        this.bitIndex += bits;
    }

    readBoolean = this.readBit;
    readInt8 = () => this.readBits(8, true);
    readUint8 = () => this.readBits(8, false);
    readInt16 = () => this.readBits(16, true);
    readUint16 = () => this.readBits(16, false);
    readInt32 = () => this.readBits(32, true);
    readUint32 = () => this.readBits(32, false);

    writeBoolean = this.writeBit;
    writeInt8 = (value: number) => this.writeBits(value, 8);
    writeUint8 = this.writeInt8;
    writeInt16 = (value: number) => this.writeBits(value, 16);
    writeUint16 = this.writeInt16;
    writeInt32 = (value: number) => this.writeBits(value, 32);
    writeUint32 = this.writeInt32;

    readBuffer(byteLength: number): Buffer {
        const buffer = this.view.getBuffer(this.bitIndex, byteLength);
        this.bitIndex += byteLength * 8;
        return buffer;
    }

    writeBuffer(buffer: Buffer) {
        this.view.writeBuffer(this.bitIndex, buffer);
        this.bitIndex += buffer.length * 8;
    }

    readString(byteLength: number, encoding?: BufferEncoding): string {
        const string = this.view.getString(this.bitIndex, byteLength, encoding);
        this.bitIndex += byteLength * 8;
        return string;
    }

    writeString(string: string, byteLength: number = string.length, encoding?: BufferEncoding) {
        this.view.writeString(this.bitIndex, string, byteLength, encoding);
        this.bitIndex += byteLength * 8;
    }
}