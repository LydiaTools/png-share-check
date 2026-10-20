# Original synthetic fixtures

`diagram-with-scene.png` and `diagram-pixels-only.png` have identical image data. The first contains an Excalidraw-compatible text envelope with an explicitly synthetic note that is absent from its raster image. The second does not contain text chunks.

These are independently generated test examples, not screenshots of another person's document and not proof of a particular editor's export behavior. Generate them with `npm run samples`. `demo.js` contains the same sample for a network-free `file://` demo.

`diagram-with-exif.png` adds a valid little-endian EXIF orientation-6 profile and a synthetic text note to the same raster. Open it in the app to compare default EXIF retention with the explicit removal option. This original synthetic case is included in the offline ZIP; its vertical presentation is intentional.

The visible drawing, bitmap lettering, scene and generator are original work under this repository's MIT license. No third-party font or image is bundled.
