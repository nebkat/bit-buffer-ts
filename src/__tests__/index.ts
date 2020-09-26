import {BitStream, BitView} from "../index";

describe('BitBuffer', () => {
    let array: Buffer;
    let bv: BitView;
    let bsw: BitStream;
    let bsr: BitStream;

    beforeEach(() => {
        array = Buffer.alloc(64);
        bv = new BitView(array);
        bsw = new BitStream(bv);
        // Test initializing straight from the array.
        bsr = new BitStream(array);
    });

    test('Min / max signed 5 bits', () => {
        var signed_max = (1 << 4) - 1;

        bsw.writeBits(signed_max, 5);
        bsw.writeBits(-signed_max - 1, 5);
        expect(bsr.readBits(5, true)).toBe(signed_max);
        expect(bsr.readBits(5, true)).toBe(-signed_max - 1);
    });

    test('Min / max unsigned 5 bits', () => {
        let unsigned_max = (1 << 5) - 1;

        bsw.writeBits(unsigned_max, 5);
        bsw.writeBits(-unsigned_max, 5);
        expect(bsr.readBits(5)).toBe(unsigned_max);
        expect(bsr.readBits(5)).toBe(1);
    });

    test('Min / max int8', () => {
        let signed_max = 0x7F;

        bsw.writeInt8(signed_max);
        bsw.writeInt8(-signed_max - 1);
        expect(bsr.readInt8()).toBe(signed_max);
        expect(bsr.readInt8()).toBe(-signed_max - 1);
    });

    test('Min / max uint8', () => {
        let unsigned_max = 0xFF;

        bsw.writeUint8(unsigned_max);
        bsw.writeUint8(-unsigned_max);
        expect(bsr.readUint8()).toBe(unsigned_max);
        expect(bsr.readUint8()).toBe(1);
    });

    test('Min / max int16', () => {
        let signed_max = 0x7FFF;

        bsw.writeInt16(signed_max);
        bsw.writeInt16(-signed_max - 1);
        expect(bsr.readInt16()).toBe(signed_max);
        expect(bsr.readInt16()).toBe(-signed_max - 1);
    });

    test('Min / max uint16', () => {
        let unsigned_max = 0xFFFF;

        bsw.writeUint16(unsigned_max);
        bsw.writeUint16(-unsigned_max);
        expect(bsr.readUint16()).toBe(unsigned_max);
        expect(bsr.readUint16()).toBe(1);
    });

    test('Min / max int32', () => {
        let signed_max = 0x7FFFFFFF;

        bsw.writeInt32(signed_max);
        bsw.writeInt32(-signed_max - 1);
        expect(bsr.readInt32()).toBe(signed_max);
        expect(bsr.readInt32()).toBe(-signed_max - 1);
    });

    test('Min / max uint32', () => {
        let unsigned_max = 0xFFFFFFFF;

        bsw.writeUint32(unsigned_max);
        bsw.writeUint32(-unsigned_max);
        expect(bsr.readUint32()).toBe(unsigned_max);
        expect(bsr.readUint32()).toBe(1);
    });

    test('Unaligned reads', () => {
        bsw.writeBits(13, 5);
        bsw.writeUint8(0xFF);
        bsw.writeBits(14, 5);

        expect(bsr.readBits(5)).toBe(13);
        expect(bsr.readUint8()).toBe(0xFF);
        expect(bsr.readBits(5)).toBe(14);
    });

    test('Overwrite previous value with 0', () => {
        bv.setUint8(0, 13);
        bv.setUint8(0, 0);

        expect(bv.getUint8(0)).toBe(0);
    });

    /*test('Read / write ASCII string', () => {
        let str = 'foobar';

        bsw.writeString(str, str.length, 'ascii');
        expect(bsw.byteIndex).toBe(str.length);

        expect(bsr.readString(str.length, 'ascii')).toBe(str);
        expect(bsr.byteIndex).toBe(str.length);
    });

    test('Read ASCII string, 0 length', () => {
        let str = 'foobar';

        bsw.writeString(str, str.length, 'ascii');
        expect(bsw.byteIndex).toBe(str.length);

        expect(bsr.readString(0, 'ascii')).toBe('');
        expect(bsr.byteIndex).toBe(0);
    });

    test('Read overflow', () => {
        expect(() => bsr.readString(128, 'ascii')).toThrow();
    });

    test('Write overflow', () => {
        expect(() => bsr.writeString('foobar', 128, 'ascii')).toThrow();
    });*/

    test('Get boolean', () => {
        bv.setUint8(0, 0x80);
        expect(bv.getBoolean(0)).toBe(true);

        bv.setUint8(0, 0);
        expect(bv.getBoolean(0)).toBe(false);
    });

    test('Set boolean', () => {
        bv.setBoolean(0, true);
        expect(bv.getBoolean(0)).toBe(true);

        bv.setBoolean(0, false);
        expect(bv.getBoolean(0)).toBe(false);
    });

    test('Read boolean', () => {
        bv.setBits(0, 1, 1);
        bv.setBits(1, 0, 1);

        expect(bsr.readBoolean()).toBe(true);
        expect(bsr.readBoolean()).toBe(false);
    });

    test('Write boolean', () => {
        bsr.writeBoolean(true);
        expect(bv.getBoolean(0)).toBe(true);

        bsr.writeBoolean(false);
        expect(bv.getBoolean(1)).toBe(false);
    });

    test('Read / write UTF8 string, only ASCII characters', () => {
        let str = 'foobar';

        bsw.writeString(str);
        expect(bsw.byteIndex).toBe(str.length);

        expect(bsr.readString(str.length)).toBe(str);
        expect(bsr.byteIndex).toBe(str.length);
    });

    test('Read / write UTF8 string, non ASCII characters', () => {
        const str = '日本語';

        const bytes = [
            0xE6,
            0x97,
            0xA5,
            0xE6,
            0x9C,
            0xAC,
            0xE8,
            0xAA,
            0x9E
        ];

        bsw.writeString(str, Buffer.byteLength(str));

        for (let i = 0; i < bytes.length; i++) {
            expect(bv.getBits(i * 8, 8, false)).toBe(bytes[i]);
        }

        expect(bsw.byteIndex).toBe(bytes.length);

        expect(bsr.readString(bytes.length)).toBe(str);
        expect(bsr.byteIndex).toBe(bytes.length);
    });

    test('readBuffer', () => {
        bsw.writeBits(0b11110000, 8);
        bsw.writeBits(0b11110001, 8);
        bsw.writeBits(0b11110001, 8);
        bsr.readBits(3); // offset

        let buffer = bsr.readBuffer(2);

        expect(buffer[0]).toBe(0b10000111);
        expect(buffer[1]).toBe(0b10001111);

        expect(bsr.index).toBe(3 + (2 * 8));
    });

    test('writeBuffer', () => {
        let source = Buffer.alloc(4);
        source[0] = 0b11110000;
        source[1] = 0x11110001;
        source[2] = 0x11110001;
        bsr.readBits(3); // offset

        bsr.writeBuffer(source.slice(0, 2));
        expect(bsr.index).toBe(19);

        bsr.index = 0;
        expect(bsr.readBits(8)).toBe(0b00011110);
    });

    test('Get buffer from view', () => {
        bv.setBits(0, 0xFFFFFFFF, 32);
        let buffer = Buffer.from(bv.buffer);

        expect(buffer.length).toBe(64);
        expect(buffer.readUInt16LE(0)).toBe(0xFFFF);
    });

    test('Get buffer from stream', () => {
        bsw.writeBits(0xFFFFFFFF, 32);
        let buffer = Buffer.from(bsr.buffer);

        expect(buffer.length).toBe(64);
        expect(buffer.readUInt16LE(0)).toBe(0xFFFF);
    });
});

describe('Reading big/little endian', () => {
    let array: Buffer;
    let bsr: BitStream;

    beforeEach(() => {
        array = Buffer.alloc(64);
        array[0] = 0x01;
        array[1] = 0x02;
        array[2] = 0x03;
        array[3] = 0x04;
        array[4] = 0x05;
        array[5] = 0x06;
        array[6] = 0x07;
        array[7] = 0x08;
        // Test initializing straight from the array.
        bsr = new BitStream(array);
    });

    test('4b, big-endian', () => {
        expect(bsr.index).toBe(0);

        let result = [];
        result.push(bsr.readBits(4));
        result.push(bsr.readBits(4));
        result.push(bsr.readBits(4));
        result.push(bsr.readBits(4));

        // 0000 0001  0000 0010  [01 02]
        // [#1] [#2]  [#3] [#4]
        expect(result).toEqual([0, 1, 0, 2]);
    });

    test('8b, big-endian', () => {
        expect(bsr.index).toBe(0);

        let result = [];
        result.push(bsr.readBits(8));
        result.push(bsr.readBits(8));

        // 0000 0001  0000 0010  [01 02]
        // [     #1]  [     #2]
        expect(result).toEqual([1, 2]);
    });

    test('10b, big-endian', () => {
        expect(bsr.index).toBe(0);

        let result = [];
        result.push(bsr.readBits(10));
        result.push(bsr.readBits(6));

        // 0000 0001  0000 0010  [01 02]
        // [         #1][   #2]
        expect(result).toEqual([4, 2]);
    });

    test('16b, big-endian', () => {
        expect(bsr.index).toBe(0);

        let result = [];
        result.push(bsr.readBits(16));

        // 0000 0001  0000 0010  [01 02]
        // [                #1]
        expect(result).toEqual([0x102]);
    });

    test('24b, big-endian', () => {
        expect(bsr.index).toBe(0);

        let result = [];
        result.push(bsr.readBits(24));

        // 0000 0001  0000 0010  0000 0011  [01 02 03]
        // [                           #1]
        expect(result).toEqual([0x010203]);
    });

    test('32b, big-endian', () => {
        expect(bsr.index).toBe(0);

        let result = [];
        result.push(bsr.readBits(32));

        // 0000 0001  0000 0010  0000 0011  0000 0100 [01 02 03 04]
        // [                                      #1]
        expect(result).toEqual([0x01020304]);
    });

    test('48b, big-endian', () => {
        expect(bsr.index).toBe(0);

        let result = [];
        result.push(bsr.readBits(48));

        // 0000 0001  0000 0010  0000 0011  0000 0100  0000 0101  0000 0110 [01 02 03 04 05 06]
        // [                                                            #1]
        expect(result).toEqual([0x010203040506]);
    });

    test('64b, big-endian', () => {
        expect(bsr.index).toBe(0);

        let result = [];
        result.push(bsr.readBits(64));

        // 0000 0001  0000 0010  0000 0011  0000 0100  0000 0101  0000 0110  0000 0111 0000 1000 [01 02 03 04 05 06 07 08]
        // [                                                                                 #1]
        expect(result).toEqual([0x0102030405060708]);
    });
});

describe('Writing big/little endian', () => {
    let array: Buffer;
    let bv: BitView;
    let bsw: BitStream;

    beforeEach(() => {
        array = Buffer.alloc(8);
        bv = new BitView(array);
        bsw = new BitStream(bv);
    });

    /*test('4b, big-endian', () => {
        // 0000 0001  0000 0010  [01 02]
        // [#1] [#2]  [#3] [#4]
        bsw.writeBits(0, 4);
        bsw.writeBits(1, 4);
        bsw.writeBits(0, 4);
        bsw.writeBits(2, 4);

        expect([...array.slice(0, 2)]).toEqual([0x01, 0x02]);
    });

    test('8b, big-endian', () => {
        // 0000 0001  0000 0010  [01 02]
        // [     #1]  [     #2]
        bsw.writeBits(1, 8);
        bsw.writeBits(2, 8);

        expect([...array.slice(0, 2)]).toEqual([0x01, 0x02]);
    });

    test('10b, big-endian', () => {
        // 0000 0001  0000 0010  [01 02]
        // [         #1][   #2]
        bsw.writeBits(4, 10);
        bsw.writeBits(2, 6);

        expect([...array.slice(0, 2)]).toEqual([0x01, 0x02]);
    });

    test('16b, big-endian', () => {
        // 0000 0001  0000 0010  [01 02]
        // [                #1]
        bsw.writeBits(0x0102, 16);

        expect([...array.slice(0, 2)]).toEqual([0x01, 0x02]);
    });

    test('24b, big-endian', () => {
        // 0000 0001  0000 0010  0000 0011  [01 02 03]
        // [                #1]
        bsw.writeBits(0x010203, 24);

        expect([...array.slice(0, 3)]).toEqual([0x01, 0x02, 0x03]);
    });*/

    test('unsigned write', () => {
        for (let offset = 0; offset < 8; offset++) {
            for (let bits = 1; bits < 48; bits += 1) {
                const max = 2 ** bits - 1;
                for (let p = 0; p <= 100; p++) {
                    const val = Math.ceil(max * (p / 100));
                    bv.setBits(offset, val, bits);
                    const read = bv.getBits(offset, bits, false);

                    if (read != val) console.log(
                            array.readUIntBE(0, Math.floor(bits / 8) + 1).toString(2).padStart(bits, "0").slice(0, bits)
                            , 'in:', val, 'out:', read, bits);
                    expect(read).toEqual(val);
                }
            }
        }
    });

    test('signed write', () => {
        for (let bits = 31; bits < 48; bits += 1) {
            const max = 2 ** bits - 1;
            for (let p = 0; p <= 1000; p++) {
                const val = Math.ceil(max * (p / 1000)) - (2 ** (bits - 1));
                array.writeIntBE(0, 0, 6);
                bsw.index = 0;
                bsw.writeBits(val, bits);
                bsw.index = 0;
                const read = bsw.readBits(bits, true);

                if (read != val) console.log(
                        array.readUIntBE(0, Math.floor(bits / 8) + 1).toString(2).padStart(bits, "0").slice(0, bits)
                        , 'in:', val, 'out:', read, bits);
                expect(read).toBe(val);
            }
        }
    });

    test('32b, big-endian', () => {
        for (let bits = 8; bits < 48; bits += 8) {
            for (let i = 2 ** bits - 1; i > 0; i -= 2 ** (bits - 2)) {
                bsw.index = 0;
                bsw.writeBits(i, bits);
                bsw.index = 0;
                let j = bsw.readBits(bits, false);
                expect(array.readUIntBE(0, bits / 8)).toBe(i);
                expect(j).toBe(i);
            }
        }

        bsw.index = 0;
        // 0000 0001  0000 0010  0000 0011  0000 0100  [01 02 03 04]
        // [                #1]
        bsw.writeBits(0x01020304, 32);

        expect([...array.slice(0, 4)]).toEqual([0x01, 0x02, 0x03, 0x04]);
    });
});