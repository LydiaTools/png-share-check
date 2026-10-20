# Behavior and boundaries

## Input and resource limits

- Static PNG only; maximum 12 MiB, 12 million pixels and 2,048 chunks. APNG chunks are rejected.
- Signature, chunk boundaries and CRCs are checked. IHDR fields, palette presence for indexed color and consecutive IDAT ordering have selected checks. The browser must also decode the image before actions appear.
- This is **not** a complete PNG conformance validator. A browser's raster decoder remains part of the preview path.
- Text decoding is capped at 128 entries, 1 MiB per expanded item and 4 MiB aggregate decoded/decompressed bytes. A scene's envelope and decompressed contents count separately. Preview strings are capped at 8,000 characters; at most 100 scene text elements are displayed.
- An inspection worker is terminated after 8 seconds. Limits may reject legitimate large files. They are not a promise against every browser or decoder vulnerability.

## Scene support

Only the `application/vnd.excalidraw+json` text keyword is interpreted as an editable scene. Supported contents are direct JSON with `type: "excalidraw"`, or a byte-string envelope with `encoding: "bstring"` and a boolean `compressed` flag. Compressed text uses zlib/deflate via the browser's native DecompressionStream.

This is a read-only text summary, not a renderer or full editor. It reads `text` from text elements, including any stored elements the exporter placed in that scene. It cannot determine which elements were visible in the raster export. It does not inspect other editors, recover missing text, render embedded assets or infer whether data is private.

PNG text values, filenames and scenes are untrusted. They are assigned with `textContent`, never executed as HTML/SVG or used for network requests. The page's CSP disables connections and third-party scripts. File bytes are retained in memory until replaced, cleared or the tab closes; clearing is not a secure memory-erasure guarantee.

## Cleaning and proof

Default cleaning removes all `tEXt`, `zTXt`, `iTXt` chunks and all bytes after the first valid IEND. EXIF is retained by default, including orientation and any other information it contains. Selecting **Also remove EXIF** removes all `eXIf` chunks too. It does not selectively remove EXIF fields, preserve author credit inside removed chunks or edit a scene. The new filename ends in `-without-text.png`; the original is not overwritten.

Every retained chunk is copied exactly. Color/profile chunks such as `iCCP`, `sRGB`, `gAMA` and `cHRM` remain, as do unknown ancillary chunks, which are disclosed. These may contain additional data; “no targeted metadata found” does **not** mean the file carries no other information. Visible pixels can contain text, QR codes, watermarks or other information and are unchanged.

The cleaned file is re-inspected. The concatenated IDAT payloads must have matching SHA-256 before a copy is offered. This proves the compressed image data was retained. It does not prove every viewer will display the same orientation if EXIF is removed, or certify privacy. Whole-file hashes distinguish the actual original and output. The report states the EXIF choice and retained EXIF count; it never silently describes retained EXIF as removed.

### Why EXIF removal is optional

An original synthetic PNG with valid EXIF orientation 6 reproduced a v0.1.0 issue in Chromium 151: displayed dimensions changed from 600×960 to 960×600 after automatic EXIF removal, although IDAT hashes matched. The control with orientation 1 stayed unchanged. [Original reproduction run](https://github.com/LydiaTools/png-share-check/actions/runs/39472015280).

v0.1.1 keeps EXIF by default. The regression suite covers all eight orientations, both little- and big-endian TIFF profiles, text removal, the retained count in the report, changing the choice after cleaning, and an explicit EXIF-removal download. Opting into removal can rotate or mirror the display; the app shows a notice and lets the user compare both previews. It does not re-encode pixels to compensate for EXIF removal.

This is a case where a matching compressed-data hash is narrower evidence than a matching rendered picture. [PNG eXIf definition](https://www.w3.org/TR/png-3/#11eXIf).

The JSON report contains counts, sizes, chunk types and hashes; no filenames, keyword names, scene text or metadata values. Hashes identify files and can still be correlatable; review the report before sharing it.

Report width/height values are the stored IHDR dimensions. The image preview labels use the browser's decoded dimensions, including its EXIF orientation handling.

## Compatibility evidence

Public official fixtures, checked privately on 2026-10-21 Asia/Shanghai:

| Excalidraw fixture | SHA-256 | Result |
| --- | --- | --- |
| `smiley_embedded_v2.png` | `d62147db2f66d839881034f8a1c3d82d1fda95d2a1383749d316c5c9db920abc` | 1 scene / 1 text element; IDAT retained |
| `test_embedded_v1.png` | `8dc62bebeb3b2d0267fd3427620a7da0f3e3809b1cbe83478e2eace295eca258` | 1 scene / 1 text element; IDAT retained |
| `smiley.png` | `b4a9269a92489c83e37b4d4673e64b008fbfcd2a6f18bf6482db6d23e7a08b1a` | No text; unchanged output |

Source: [official fixture directory at a pinned commit](https://github.com/excalidraw/excalidraw/tree/bee01e3a12812c930109aa91242658709480bbf3/packages/excalidraw/tests/fixtures). These are compatibility spot checks, not a claim that every past or future export works. Shipped demos are separately generated synthetic examples.
