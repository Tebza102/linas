// Lina's admin portal — Settings. Owner-only (see firestore.rules).
import { requireAuth } from "./auth-guard.js";
import { db } from "./firebase-init.js";
import { initLayout } from "./layout.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const GOAL_FALLBACK = 350000;

async function main() {
  const { user, role } = await requireAuth();
  initLayout({ user, role, active: "settings" });

  if (role !== "owner") {
    document.getElementById("accessDenied").hidden = false;
    return;
  }
  document.getElementById("settingsBody").hidden = false;
  document.getElementById("accountEmail").textContent = user.email;
  document.getElementById("accountRole").textContent = role;

  const goalInput = document.getElementById("goalInput");
  const goalStatus = document.getElementById("goalSaveStatus");

  const snap = await getDoc(doc(db, "settings", "business"));
  goalInput.value = (snap.exists() && typeof snap.data().dashboardGoal === "number") ? snap.data().dashboardGoal : GOAL_FALLBACK;

  document.getElementById("saveGoalBtn").addEventListener("click", async () => {
    const value = Number(goalInput.value);
    if (!Number.isFinite(value) || value < 0) {
      goalStatus.textContent = "Enter a valid target amount.";
      goalStatus.setAttribute("data-state", "error");
      return;
    }
    try {
      await setDoc(doc(db, "settings", "business"), { dashboardGoal: value, updatedAt: serverTimestamp() }, { merge: true });
      goalStatus.textContent = "Saved.";
      goalStatus.setAttribute("data-state", "success");
    } catch (err) {
      console.error(err);
      goalStatus.textContent = "Could not save: " + (err.message || "unknown error");
      goalStatus.setAttribute("data-state", "error");
    }
  });
}

main().catch((err) => {
  console.error("Settings failed to load:", err);
});
