(function() {
    'use strict';
    const crcTable = Array.from({length: 256}, (_, value) => {
        for (let bit = 0; bit < 8; bit++) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
        return value >>> 0;
    });
    function crc32(bytes) {
        let crc = 0xffffffff;
        for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
        return (crc ^ 0xffffffff) >>> 0;
    }
    // ZIP's stored format keeps packaging local and needs no third-party library.
    function zip(entries) {
        if (entries.length > 65535) throw new Error('Too many files for one equipment package.');
        const encoder = new TextEncoder();
        const files = [], directory = [];
        let offset = 0, directorySize = 0;
        const seen = new Set();
        for (const entry of entries) {
            if (!/^(?!\/|.*(?:\\|\.\.))[A-Za-z0-9_./-]+$/.test(entry.name) || seen.has(entry.name)) throw new Error('Invalid or duplicate package path.');
            seen.add(entry.name);
            const name = encoder.encode(entry.name);
            const bytes = entry.bytes;
            if (!(bytes instanceof Uint8Array) || name.length > 65535 || offset + bytes.length + 30 + name.length > 0xffffffff) throw new Error('Equipment package is too large.');
            const crc = crc32(bytes);
            const header = new Uint8Array(30 + name.length);
            const local = new DataView(header.buffer);
            local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true);
            local.setUint16(6, 0x0800, true); local.setUint16(12, 33, true);
            local.setUint32(14, crc, true); local.setUint32(18, bytes.length, true); local.setUint32(22, bytes.length, true);
            local.setUint16(26, name.length, true); header.set(name, 30);
            files.push(header, bytes);
            const record = new Uint8Array(46 + name.length);
            const central = new DataView(record.buffer);
            central.setUint32(0, 0x02014b50, true); central.setUint16(4, 20, true); central.setUint16(6, 20, true);
            central.setUint16(8, 0x0800, true); central.setUint16(14, 33, true);
            central.setUint32(16, crc, true); central.setUint32(20, bytes.length, true); central.setUint32(24, bytes.length, true);
            central.setUint16(28, name.length, true); central.setUint32(42, offset, true); record.set(name, 46);
            directory.push(record);
            offset += header.length + bytes.length;
            directorySize += record.length;
        }
        if (offset + directorySize > 0xffffffff) throw new Error('Equipment package is too large.');
        const end = new Uint8Array(22);
        const view = new DataView(end.buffer);
        view.setUint32(0, 0x06054b50, true); view.setUint16(8, entries.length, true); view.setUint16(10, entries.length, true);
        view.setUint32(12, directorySize, true); view.setUint32(16, offset, true);
        return new Blob([...files, ...directory, end], {type: 'application/zip'});
    }
    window.ItemPackage = {zip, crc32};
})();
