# Original synthetic fixtures

`diagram-with-scene.png` and `diagram-pixels-only.png` have identical image data. The first contains an Excalidraw-compatible text envelope with an explicitly synthetic note that is absent from its raster image. The second does not contain text chunks.

These are independently generated test examples, not screenshots of another person's document and not proof of a particular editor's export behavior. Generate them with `npm run samples`. `demo.js` contains the same sample for a network-free `file://` demo.

`diagram-with-exif.png` adds a valid little-endian EXIF orientation-6 profile and a synthetic text note to the same raster. Open it in the app to compare default EXIF retention with the explicit removal option. This original synthetic case is included in the offline ZIP; its vertical presentation is intentional.

The visible drawing, bitmap lettering, scene and generator are original work under this repository's MIT license. No third-party font or image is bundled.

## Actual SDK export of an original scene

`editor-frame.excalidraw` is an original synthetic scene with a Frame and one multiline text element. The official npm Excalidraw SDK 0.18.1 produced `editor-frame-embedded.png` using `exportingFrame` and `exportEmbedScene: true`. Its last line lies below the exported frame. `editor-frame-without-text.png` is the actual PNG Share Check UI download from that input. The system font is rendered into the PNG; no SDK implementation or font binary is shipped with the app.

These separately downloadable repository examples are not included in the fixed v0.1.1 offline ZIP. See the [experiment and reproduction](https://github.com/LydiaTools/png-share-check/blob/main/docs/editor-export.md), including the different-note and embed-disabled controls. This case does not establish what the hosted Excalidraw editor selects or exports.
