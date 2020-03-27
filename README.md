# BitBuffer

BitBuffer provides two objects, `BitView` and `BitStream`. `BitView` is a wrapper for ArrayBuffers, similar to JavaScript's [DataView](https://developer.mozilla.org/en-US/docs/JavaScript/Typed_arrays/DataView), but with support for bit-level reads and writes. `BitStream` is a wrapper for a `BitView` used to help maintain your current buffer position, as well as to provide higher-level read / write operations such as for ASCII strings.

## BitView

### Attributes

```javascript
bb.buffer  // Underlying Buffer.
```

```javascript
bb.bigEndian = false; // Switch to little endian (default is big)
```

### Methods

#### BitView(buffer, optional byteStart, optional byteEnd)

Default constructor, takes in a single argument of a Buffer. Optional are the `byteStart` and `byteEnd` arguments to offset and truncate the view's representation of the buffer.

### getBits(offset, bits, signed)

Reads `bits` number of bits starting at `offset`.

### getInt8, getUint8, getInt16, getUint16, getInt32, getUint32(offset)

Shortcuts for getBits, setting the correct `bits` / `signed` values.

### setBits(offset, value, bits)

Sets `bits` number of bits starting at `offset`.

### setInt8, setUint8, setInt16, setUint16, setInt32, setUint32(offset)

Shortcuts for setBits, setting the correct `bits` count.

### getBuffer(offset, byteLength, optional buffer)

Reads `byteLength` bytes starting at `offset` into a Buffer.

### writeBuffer(offset, buffer)

Writes the contents of `buffer` starting at `offset`.

## BitStream

### Attributes

```javascript
bb.index;           // Get the current index in bits
bb.index = 0;       // Set the current index in bits
```

```javascript
bb.byteIndex;       // Get current index in bytes.
bb.byteIndex = 0;   // Set current index in bytes.
```

```javascript
bb.view;        // Underlying BitView
bb.buffer;      // Underlying BitView buffer
```

```javascript
bb.length;      // Get the length of the stream in bits
bb.byteLength;  // Get the length of the stream in bytes
```

```javascript
bb.bitsLeft;    // The number of bits left in the stream
```

```javascript
bb.bigEndian = true;    // Switch to big endian (default is little)
```

### Methods

#### BitStream(view)

Default constructor, takes in a single argument of a `BitView`.

#### BitSteam(buffer, optional byteOffset, optional byteLength)

Shortcut constructor that initializes a new `BitView(buffer, byteOffset, byteLength)` for the stream to use.

#### readBits(bits, signed)

Returns `bits` numbers of bits from the view at the current index, updating the index.

#### writeBits(value, bits)

Sets `bits` numbers of bits from `value` in the view at the current index, updating the index.

#### readUint8(), readUint16(), readUint32(), readInt8(), readInt16(), readInt32()
 
Read a 8, 16 or 32 bits (unsigned) integer at the current index, updating the index.

#### writeUint8(value), writeUint16(value), writeUint32(value), writeInt8(value), writeInt16(value), writeInt32(value)
 
Write 8, 16 or 32 bits from `value` as (unsigned) integer at the current index, updating the index.

#### readBoolean()

Read a single bit from the view at the current index, updating the index.

#### writeBoolean(value)

Write a single bit to the view at the current index, updating the index.

#### readBuffer(byteLength)

Read `byteLength` bytes of data from the underlying view as a `Buffer`, updating the index.

### writeBuffer(buffer)

Writes a buffer to the underlying view starting at the current index, updating the index.

#### readString(byteLength, optional encoding)

Reads `byteLength` bytes from the underlying view as a string, updating the index. Optional `encoding` argument sets the string encoding, defaulting to `utf-8`. 

#### writeString(string, optional byteLength, optional encoding)

Writes a string to the underlying view starting at the current index, updating the index. If the string is longer than `byteLength` it will be truncated, and if it is shorter 0x00 will be written in its place. Optional `encoding` argument sets the string encoding, defaulting to `utf-8`.

## license

MIT
