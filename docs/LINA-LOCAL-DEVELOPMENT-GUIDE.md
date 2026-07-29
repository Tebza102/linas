# Lina's — Local Prototype: How to View It

This guide is for anyone who needs to view the client-review prototype on this computer — no technical background required.

**Important:** This is a local preview of a design prototype, not the final live website. Nothing here is deployed to the internet, and no real orders, enquiries, or messages are sent or stored.

## Start the prototype

**Option A — the simple way:** Double-click this file in the project folder:

```
START-LINA-PROTOTYPE.bat
```

A black window will open and stay open. Wait a second, then open your web browser and go to:

```
http://localhost:8000
```

**Option B — if you're comfortable with a terminal:**

```powershell
cd C:\Users\appri\linas
npm run prototype
```

Then open `http://localhost:8000` in your browser.

## Stop the prototype

Click into the black terminal window and press:

```
Ctrl + C
```

The window will confirm the server has stopped. You can then close the window.

Do not just close the window with the X button while it's still loading — pressing Ctrl+C first lets it shut down cleanly.

## Common issues

**"Port 8000 is already in use"**
Something else on this computer is already using that address — often another copy of this same server left running from earlier. Close any other black terminal windows related to Lina's, then try again. If you know what you're doing, you can also run it on a different port:
```powershell
$env:PORT=8001
npm run prototype
```
then open `http://localhost:8001` instead.

**"'node' is not recognized" or "'npm' is not recognized"**
Node.js isn't installed, or isn't set up correctly, on this computer. Install it from `https://nodejs.org` (choose the LTS version), restart the computer, and try again.

**Blank page in the browser**
Make sure the black terminal window is still open and says "server running." If it's closed, the page can't load anything. Also check you typed `http://localhost:8000` exactly (not `https`).

**Missing images or video**
Make sure you started the server from inside the `C:\Users\appri\linas` folder (the launcher does this for you automatically). If you moved or renamed any folders inside the project, some images or the video may not load — nothing was deleted, but a folder rename can break the links between files.

**The page looks like an old version**
Your browser may be showing a cached copy. Hold Shift and click the browser's refresh button (or press Ctrl+Shift+R) to force a full reload.

**Running the command from the wrong folder**
If you see an error like "cannot find module," you're probably not in the `C:\Users\appri\linas` folder. Using the `START-LINA-PROTOTYPE.bat` launcher avoids this entirely, since it moves to the right folder automatically.

**A Windows Firewall prompt appears**
Windows may ask whether to allow Node.js to communicate on the network. Choose "Allow access" (or "Allow" for private networks) — this only affects your own computer talking to itself; nothing is exposed to the internet.

**Accidentally closed the terminal window**
No harm done. Just start it again using either option above.

## A few things worth knowing

- The browser preview only works while the black terminal window stays open. Closing it stops the prototype.
- This is a local review copy of the design, not the production website — it has no database, no admin area, and does not send real messages anywhere.
- If the project files are edited later, refreshing the browser page will show the changes — you don't need to restart the server for most changes (only if the server itself is changed).
