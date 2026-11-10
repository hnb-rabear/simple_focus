# Simple Focus

A daily time limit for each website. Today's usage is shared across your PCs.

## Setup (on each PC)

1. Copy this folder to the PC.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick this folder.
4. Turn on Chrome Sync: open `chrome://settings/syncSetup`, and make sure **Extensions** is checked. Being signed in alone is not enough.

Click the extension icon to add sites and limits. A limit of `0` blocks the site all day.

Adding a site or lowering a limit applies at once. Raising a limit or removing a site waits one hour, and you can cancel it while it waits.

Without step 4, the extension still works, but each PC keeps its own time.

## How time counts

Once per minute, every site that is open in any tab counts one minute, even in a background tab or a minimized window. A site counts at most one minute per minute, however many tabs it has. Nothing counts while the screen is locked or Chrome is closed. Usage resets at local midnight.

## Tests

`node test.mjs`
