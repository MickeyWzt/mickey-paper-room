# Gemini code import snapshot

This branch contains all tracked application source, configuration, content data, and text asset metadata from main at bce4d960f2b4029c1b48f8e9745ef44141f2baf3.

Binary GLB models, photography, textures, and fonts are omitted to stay below the 100 MB import limit shown by Gemini. They remain in the complete main branch. No source logic was changed. This snapshot is for code review; running or building it requires restoring the binary assets from main, because vite.config.js reads model and texture sizes at build time.

- Full project: https://github.com/MickeyWzt/mickey-paper-room/tree/main
- Running site: https://mickey-paper-room.onrender.com/
- Import this branch: https://github.com/MickeyWzt/mickey-paper-room/tree/codex/gemini-source
- ASSET-MANIFEST.json lists omitted binaries, their sizes, hashes, and paths. Public files are available at the same paths on the running site (without the public/ prefix); old retained assets may only exist in main.
- The current application entry is src/room-v3.js. Early React prototypes are retained for reference.
