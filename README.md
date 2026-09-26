# My Comic Vaults

Personal CGC comic collection catalog, optimized for iPhone and iPad.

## Collection workflow

1. Verify a comic on CGC and provide the verification PDF/screenshot.
2. Extract the certification metadata and crop the combined front/back slab image consistently.
3. Review and approve a small set of meaningful collection tags.
4. Add the approved record to the import queue and store its image in Netlify Blobs.
5. The app checks certification numbers to avoid duplicates and exposes the comic through search and approved tags.

## Storage

- Netlify Blobs store: `comic-vault`
- Metadata key: `collection.json`
- Images: `comic-images/<certification-number>`
- GitHub keeps source/version history and the controlled import queue.

## UI

Collection cards intentionally show only the combined front/back image, comic title, and CGC certification number. Tapping a card opens the full CGC record.

Unknown information is left blank/Unknown rather than guessed.
