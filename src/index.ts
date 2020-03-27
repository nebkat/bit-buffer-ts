export class BitView {
    readonly buffer: Buffer;
    readonly bitLength: number;
    readonly byteLength: number;

    bigEndian = true;

    constructor(source: Buffer, private byteStart: number = 0, readonly byteEnd: number = source.length) {
        this.buffer = source.slice(byteStart, byteEnd);
        this.byteLength = this.buffer.length;
        this.bitLength = this.byteLength * 8;
    }

    private checkBounds(offset: number, bits: number) {
        let available = (this.bitLength - offset);

        if (bits > available)
            throw new Error('Cannot get/set ' + bits + ' bit(s) from offset ' + offset + ', ' + available + ' available');
    }

    getBit(offset: number): boolean {
        this.checkBounds(offset, 1);

        let bitOffset = offset & 7;
        let byteOffset = offset >> 3;

        return (this.buffer[byteOffset] >> (7 - bitOffset) & 0b1) === 1;
    }

    getBits(offset: number, bits: number, signed: boolean) {
        this.checkBounds(offset, bits);

        let bitOffset = offset & 0b111;
        let startByte = offset >> 3;
        let endByte = startByte + ((bits + bitOffset) >> 3);

        let big = 0;
        let written = 0;
        for (let i = startByte; i <= endByte; i++) {
            let byte = this.buffer[i];
            if (i === startByte) byte &= 0xff >> bitOffset;
            if (i === endByte) byte >>= 8 - ((bits + bitOffset) & 7);
            if (i !== startByte) {
                let shift = i === endByte ? (bits + bitOffset) & 7 : 8;
                written += shift;
                if (written < 32) {
                    big <<= shift;
                } else {
                    big *= 2**shift;
                }
            }
            if (written < 32) big |= byte; else big += byte;
        }

        if (signed) {
            // If we're not working with a full 32 bits, check the
            // imaginary MSB for this bit count and convert to a
            // valid 32-bit signed value if set.
            if (bits < 32 && big & (1 << (bits - 1))) {
                big |= -1 ^ ((1 << bits) - 1);
            } else if (big > 2**(bits - 1)) {
                big -= 2**(bits);
            }

            return big;
        }

        return big;
    }

    setBit(offset: number, value: boolean) {
        this.checkBounds(offset, 1);

        let bitOffset = offset & 7;
        let byteOffset = offset >> 3;

        let mask = 0b1 << (7 - bitOffset);
        if (value) {
            this.buffer[byteOffset] |= mask;
        } else {
            this.buffer[byteOffset] &= ~mask;
        }
    }

    setBits(offset: number, value: number, bits: number) {
        this.checkBounds(offset, bits);

        for (let i = 0; i < bits;) {
            let remaining = bits - i;
            let bitOffset = offset & 7;
            let byteOffset = offset >> 3;
            let wrote = Math.min(remaining, 8 - bitOffset);

            let mask, writeBits, destMask;
            if (this.bigEndian) {
                // create a mask with the correct bit width
                mask = ~(~0 << wrote);
                // shift the bits we want to the start of the byte and mask of the rest
                writeBits = bits <= 32 ? ((value >> (bits - i - wrote)) & mask) : (value / (2**(bits - i - wrote)) & mask);

                let destShift = 8 - bitOffset - wrote;
                // destination mask to zero all the bits we're changing first
                destMask = ~(mask << destShift);

                this.buffer[byteOffset] =
                        (this.buffer[byteOffset] & destMask)
                        | (writeBits << destShift);
            } else {
                // create a mask with the correct bit width
                mask = ~(0xFF << wrote);
                // shift the bits we want to the start of the byte and mask of the rest
                writeBits = value & mask;
                value >>= wrote;

                // destination mask to zero all the bits we're changing first
                destMask = ~(mask << bitOffset);

                this.buffer[byteOffset] =
                        (this.buffer[byteOffset] & destMask)
                        | (writeBits << bitOffset);
            }

            offset += wrote;
            i += wrote;
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
        let buffer = Buffer.allocUnsafe(byteLength);
        for (let i = 0; i < byteLength; i++) {
            buffer[i] = this.getUint8(offset + (i * 8));
        }
        return buffer;
    }

    writeBuffer(offset: number, buffer: Buffer): void {
        for (let i = 0; i < buffer.length; i++) {
            this.setUint8(offset + (i * 8), buffer[i]);
        }
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

    get bigEndian() { return this.view.bigEndian; }
    set bigEndian(val) { this.view.bigEndian = val; }

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