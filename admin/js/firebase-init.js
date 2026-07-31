// Lina's admin portal — shared Firebase client SDK initialisation.
//
// This config (apiKey, projectId, etc.) is NOT a secret — Firebase's own
// docs are explicit that it identifies the project, and access is enforced
// by Firestore Security Rules (firestore.rules) and Firebase Auth, not by
// hiding these values. The Firebase Admin SDK and its real credentials are
// never used here or anywhere in browser code — only in api/_lib/firebase-admin.js,
// which runs solely on the server.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Local/test-only: connect to the Firebase Emulator Suite under a distinct
// dummy project id, instead of the real project, when explicitly requested
// via ?emulator=1 in the URL. This never activates by default, so normal
// production/preview use is completely unaffected — it exists purely to
// allow full end-to-end testing without any possibility of touching real
// production data (a different projectId is a hard namespace separation
// within the emulator, not just a different host/port).
// Emulator mode is sticky for the browsing session once requested.
//
// It used to be read from the query string alone, which meant the very first
// internal redirect (login -> inbox, or auth-guard -> login) dropped the flag
// and silently reconnected the page to REAL production Firebase — making the
// local emulator admin flow untestable past one navigation. Latching it in
// sessionStorage keeps the whole session on the emulator. Still opt-in, still
// never active by default, and scoped to the tab so it cannot leak into
// ordinary use.
const emulatorParam = new URLSearchParams(location.search).get("emulator");
let useEmulator = false;
try {
  if (emulatorParam === "1") sessionStorage.setItem("lina-use-emulator", "1");
  else if (emulatorParam === "0") sessionStorage.removeItem("lina-use-emulator");
  useEmulator = sessionStorage.getItem("lina-use-emulator") === "1";
} catch (err) {
  useEmulator = emulatorParam === "1";
}

const firebaseConfig = useEmulator
  ? { apiKey: "test-key", authDomain: "localhost", projectId: "lina-s-e2e-test" }
  : {
      apiKey: "AIzaSyA_GnLdEl2bMM-hiNQdDYvu_C_zterkP9M",
      authDomain: "lina-s.firebaseapp.com",
      projectId: "lina-s",
      storageBucket: "lina-s.firebasestorage.app",
      messagingSenderId: "341530074847",
      appId: "1:341530074847:web:667507dc77311c2831d36a"
    };

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

if (useEmulator) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8090);
  console.warn("Connected to Firebase EMULATORS (local testing mode) — not production data.");
}

// Admin sessions persist across browser restarts on the device used to log
// in (standard for an internal tool) rather than resetting every tab close.
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Failed to set auth persistence:", err);
});
