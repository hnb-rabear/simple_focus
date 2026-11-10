# Changelog

## 2026-11-10

### Added

- Simple Focus Chrome extension: a daily time limit for each website, a hard block page, and usage synced across PCs through Chrome Sync.
- Edit button on each site row: it fills the form with that site and its limit.
- `.gitignore` for local planning docs, OS/editor files, and packaged builds.
- Extension icon: a gold hourglass on a black disc with a gold ring, in 16, 32, 48, and 128 px. The source is `icons/icon.svg`.

### Changed

- A site now uses its limit for every minute it is open in any tab, including background tabs and windows that are not focused. Nothing counts while the screen is locked.
- The popup shows the time left for each site as a countdown (minutes:seconds) that updates every second, instead of the minutes used.
- Raising a limit or removing a site now waits one hour before it applies, and it can be cancelled while it waits. Adding a site or lowering a limit still applies at once.
- A waiting change shows a countdown (minutes:seconds) until it applies, updated every second.
- New look for the popup and the block page: a dark theme with gold details (an ivory theme when the system uses light mode), serif headings and countdowns, and rounded buttons. Both pages share `style.css`.

### Fixed

- The countdown stayed frozen for the first minute after the extension was loaded or reloaded.
