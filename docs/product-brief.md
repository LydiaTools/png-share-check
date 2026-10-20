# PNG Share Check: bounded prototype

Audience: people sharing diagram PNGs in documentation, GitHub issues and social posts.
Task: inspect what a PNG stores beyond visible pixels, then remove its text/EXIF metadata and trailing bytes while retaining image chunks.

Input: one static PNG, up to 12 MiB and 12 megapixels. Automatic work: validate chunk framing/CRCs, decode bounded text chunks and supported Excalidraw scene envelopes, show stored text and metadata, create a cleaned copy, re-inspect it and compare IDAT hashes. User judgment: review the visible pixels and decide what to share. There is no private-content detector or privacy certification.

Design: a blue-grey inspection bench, paper-white PNG preview and a pale-blue data pane. Ink #1c2f39, workspace #eef4f6, sky #b9e0f2, paper #ffffff, marker #db5540 and action #145d80. Trebuchet/rounded display lettering and system body text. One memorable interaction: the pixels remain still while the stored-scene pane changes after cleaning. Desktop uses two aligned panes; phone uses the same task order vertically. No decorative dashboard statistics or gradients.

Evidence: Excalidraw documents opt-in scene embedding in PNG/SVG; an r/Compliance discussion describes separate redaction layers and preserved originals. These establish a testable workflow hypothesis, not broad adoption. Generic metadata cleaners already exist; the prototype focuses on readable editable-scene text, exact chunk removal and unchanged compressed image data. Compare with existing tools before expansion.

All shipped examples must be original synthetic fixtures. Do not publish third-party private drawings or claim a vendor vulnerability. No third-party implementation is vendored. Decompression, preview and parsing remain bounded. Current goal is a complete usable preview with honest capability boundaries, then independent feedback; not a promised Star count.
