# Walk-grid authority

masterJSONData.json and masterForegroundData.json are shipped runtime sources. Their room IDs and codes are validated against ../content-contract.json.

Files containing LastOneBackup are historical snapshots only. Authoring copies and generated room fragments under utilities/ are also non-authoritative until deliberately merged into the shipped sources and accepted by npm run validate:content.

The Map uses the compact polygon definition in ../mapRoom.json; it is deterministically expanded to an 80 x 60 runtime grid by src/content/map-grid.mjs.
