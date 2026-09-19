# Walk-grid authority

masterJSONData.json and masterForegroundData.json are shipped runtime sources. Their room IDs and codes are validated against ../content-contract.json.

Files containing LastOneBackup are historical snapshots only. Authoring copies and generated room fragments under utilities/ are also non-authoritative until deliberately merged into the shipped sources and accepted by npm run validate:content.

The Map uses the compact polygon definition in ../mapRoom.json; it is deterministically expanded to an 80 x 60 runtime grid by src/content/map-grid.mjs.

Every whole-room restyle must also produce a room-specific walkable-area review package from this runtime authority. The package includes the 80 x 60 JSON fragment, an overlay on the accepted 832 x 448 background, and a placement record for exits, hotspots, objects, NPCs, and foreground occluders. Section 3's example lives under `../redesign/section-03-library-foyer/walkable/`.
