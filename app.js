import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, query, where, orderBy,
  doc, getDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyACemrJLbVV1y03BpKlNntLUdVC0-_w55c",
  authDomain: "rideeasy-81dff.firebaseapp.com",
  projectId: "rideeasy-81dff",
  storageBucket: "rideeasy-81dff.firebasestorage.app",
  messagingSenderId: "1002497659811",
  appId: "1:1002497659811:web:3d8a2be45a04f6a23b8016"
};

const firebaseConfigured = !Object.values(firebaseConfig).some(v => String(v).startsWith("PASTE_"));
let auth, db;
if (firebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const $ = id => document.getElementById(id);
const authView = $("authView"), userView = $("userView"), adminView = $("adminView");
const authForm = $("authForm");
let selectedRole = "user";
let signupMode = false;
let currentUser = null;
let currentProfile = null;
let userUnsub = null;

const cities = ["Kopargaon", "Shirdi", "Nashik", "Ahmednagar", "Chhatrapati Sambhajinagar", "Pune", "Mumbai"];
// Approximate illustrative road distances in km for the demo, symmetric pairs.
const routeKm = {
  "Kopargaon|Shirdi": 42, "Kopargaon|Nashik": 115, "Kopargaon|Ahmednagar": 80,
  "Kopargaon|Chhatrapati Sambhajinagar": 115, "Kopargaon|Pune": 210, "Kopargaon|Mumbai": 260,
  "Shirdi|Nashik": 90, "Shirdi|Ahmednagar": 85, "Shirdi|Chhatrapati Sambhajinagar": 110,
  "Shirdi|Pune": 185, "Shirdi|Mumbai": 240,
  "Nashik|Ahmednagar": 155, "Nashik|Chhatrapati Sambhajinagar": 180, "Nashik|Pune": 210, "Nashik|Mumbai": 165,
  "Ahmednagar|Chhatrapati Sambhajinagar": 120, "Ahmednagar|Pune": 120, "Ahmednagar|Mumbai": 250,
  "Chhatrapati Sambhajinagar|Pune": 235, "Chhatrapati Sambhajinagar|Mumbai": 335,
  "Pune|Mumbai": 150
};
const pricing = {
  Mini: { base: 50, perKm: 12 },
  Sedan: { base: 80, perKm: 16 },
  SUV: { base: 120, perKm: 22 }
};
const statuses = ["Pending", "Confirmed", "Driver assigned", "Driver arriving", "In progress", "Completed", "Cancelled"];
const statusProgress = {"Pending":0,"Confirmed":1,"Driver assigned":2,"Driver arriving":3,"In progress":4,"Completed":5,"Cancelled":0};

function escapeHtml(value="") {
  return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function money(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }
function setNotice(id, text, type="") {
  const el = $(id); el.className = "notice" + (type ? " " + type : ""); el.textContent = text;
}
function showView(view) {
  authView.classList.toggle("hidden", view !== "auth");
  userView.classList.toggle("hidden", view !== "user");
  adminView.classList.toggle("hidden", view !== "admin");
  $("logoutBtn").classList.toggle("hidden", view === "auth");
}
function setRole(role) {
  selectedRole = role;
  document.querySelectorAll(".tab").forEach(btn => btn.classList.toggle("active", btn.dataset.role === role));
  $("authTitle").textContent = role === "admin" ? "Admin sign in" : (signupMode ? "Create your account" : "Sign in to RideEasy");
  $("authEyebrow").textContent = role === "admin" ? "RESTRICTED ACCESS" : (signupMode ? "JOIN RIDE EASY" : "WELCOME BACK");
  $("authDescription").textContent = role === "admin" ? "Sign in with the admin account created for this project." : "Book rides and follow their status updates.";
  $("switchLine").classList.toggle("hidden", role === "admin");
  $("authSubmit").innerHTML = (signupMode && role === "user" ? "Create account" : "Sign in") + " <span>→</span>";
  setNotice("authMessage", "");
}
document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => setRole(btn.dataset.role)));
$("toggleSignup").addEventListener("click", () => { signupMode = !signupMode; setRole("user"); $("toggleSignup").textContent = signupMode ? "Sign in instead" : "Create an account"; });
function fillCityOptions() {
  const options = cities.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  $("pickup").innerHTML = options;
  $("destination").innerHTML = options;
  $("pickup").value = "Kopargaon";
  $("destination").value = "Shirdi";
  updateFare();
}
function getDistance(from, to) {
  if (from === to) return 0;
  return routeKm[`${from}|${to}`] ?? routeKm[`${to}|${from}`] ?? 100;
}
function selectedCab() { return document.querySelector('input[name="cabType"]:checked')?.value || "Mini"; }
function updateFare() {
  if (!$("pickup") || !$("destination")) return;
  const from = $("pickup").value, to = $("destination").value;
  const km = getDistance(from, to), cab = selectedCab(), rate = pricing[cab];
  $("distanceLabel").textContent = km ? `${km} km approx.` : "Choose another city";
  $("fareLabel").textContent = km ? money(rate.base + km * rate.perKm) : "—";
  $("bookBtn").disabled = from === to;
}
$("pickup").addEventListener("change", updateFare);
$("destination").addEventListener("change", updateFare);
document.querySelectorAll('input[name="cabType"]').forEach(el => el.addEventListener("change", updateFare));
fillCityOptions();

authForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (!firebaseConfigured) { setNotice("authMessage", "Firebase configuration is still missing in app.js.", "error"); return; }
  const email = $("email").value.trim(), password = $("password").value;
  $("authSubmit").disabled = true;
  try {
    if (selectedRole === "admin" && signupMode) throw new Error("Admin accounts cannot be created from this screen. Ask the project owner to create an admin user and assign its role.");
    if (signupMode && selectedRole === "user") {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // New users get a profile with user role. Firestore rules must permit users to create only their own role=user profile.
      await (await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")).setDoc(doc(db, "users", cred.user.uid), { email, role: "user", createdAt: serverTimestamp() });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
    console.error(err);
    setNotice("authMessage", friendlyAuthError(err), "error");
  } finally { $("authSubmit").disabled = false; }
});
function friendlyAuthError(err) {
  const code = err?.code || "";
  if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password") || code.includes("auth/user-not-found")) return "Email or password is incorrect.";
  if (code.includes("auth/email-already-in-use")) return "This email already has an account. Choose Sign in instead.";
  if (code.includes("auth/weak-password")) return "Use a password with at least 6 characters.";
  if (code.includes("permission-denied")) return "Firebase denied this operation. Check Authentication settings and Firestore Security Rules.";
  return err?.message || "Something went wrong. Check your Firebase setup and try again.";
}

onAuthStateChanged(auth || { onAuthStateChanged: () => {} }, async user => {
  if (!user) { currentUser = null; currentProfile = null; showView("auth"); return; }
  currentUser = user;
  try {
    const profileSnap = await getDoc(doc(db, "users", user.uid));
    currentProfile = profileSnap.exists() ? profileSnap.data() : { role: "user", email: user.email };
    $("logoutBtn").classList.remove("hidden");
    if (currentProfile.role === "admin") {
      showView("admin"); await loadAdminBookings();
    } else {
      showView("user"); $("userEmailLabel").textContent = user.email || "User"; await loadUserBookings();
    }
  } catch (err) {
    console.error(err);
    showView("auth");
    setNotice("authMessage", "Could not load your account profile. Check Firestore rules and users/{uid} role document.", "error");
  }
});
$("logoutBtn").addEventListener("click", async () => { if (auth) await signOut(auth); });
$("bookingForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUser || !db) return setNotice("bookingMessage", "Please sign in first.", "error");
  const from = $("pickup").value, to = $("destination").value, cab = selectedCab();
  if (from === to) return setNotice("bookingMessage", "Pickup and destination must be different cities.", "error");
  const distanceKm = getDistance(from, to), estimatedFare = pricing[cab].base + distanceKm * pricing[cab].perKm;
  $("bookBtn").disabled = true; $("bookBtn").textContent = "Saving booking…";
  try {
    const bookingData = {
      userId: currentUser.uid, userEmail: currentUser.email || "",
      pickup: from, destination: to, distanceKm, cabType: cab,
      estimatedFare, status: "Pending", etaMinutes: null, driverName: "",
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    };
    const ref = await addDoc(collection(db, "bookings"), bookingData);
    setNotice("bookingMessage", `✓ Booking created successfully!\nReference: ${ref.id}\nRoute: ${from} → ${to} (${distanceKm} km approx.)\nCab: ${cab} · Estimated fare: ${money(estimatedFare)}\nStatus: Pending. Your ride will show updates below when the admin updates it.`, "success");
    await loadUserBookings();
  } catch (err) {
    console.error(err); setNotice("bookingMessage", "Booking could not be saved. Check Firestore Security Rules for the required fields.", "error");
  } finally { $("bookBtn").disabled = false; $("bookBtn").innerHTML = 'Confirm booking <span>→</span>'; updateFare(); }
});
function statusClass(status) { return "status-" + String(status).toLowerCase().replaceAll(" ", "-"); }
function progressHtml(status) {
  const current = statusProgress[status] ?? 0;
  return `<div class="progress">${[0,1,2,3,4,5].map(i => `<span class="${i <= current && status !== "Cancelled" ? "done" : ""}"></span>`).join("")}</div>`;
}
function etaText(b) {
  if (b.status === "Cancelled") {
    return "This booking was cancelled.";
  }

  if (b.status === "Completed") {
    return "Ride completed.";
  }

  const driver = b.driverName
    ? `Driver: ${escapeHtml(b.driverName)}`
    : "";

  const hasEta =
    b.etaMinutes !== null &&
    b.etaMinutes !== undefined &&
    b.etaMinutes !== "";

  const eta = hasEta
    ? `ETA: ${Number(b.etaMinutes)} minutes`
    : "";

  if (driver && eta) {
    return `🚕 ${driver} · ${eta}`;
  }

  if (driver) {
    return `🚕 ${driver}`;
  }

  if (eta) {
    return `⏱️ ${eta}`;
  }

  if (b.status === "In progress") {
    return "Your ride is in progress.";
  }

  if (b.status === "Confirmed") {
    return "Your booking is confirmed. Driver details are pending.";
  }

  return "Waiting for driver assignment.";
}
async function loadUserBookings() {
  if (!currentUser || !db) return;
  try {
    const q = query(collection(db, "bookings"), where("userId", "==", currentUser.uid));
    const snap = await getDocs(q);
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    $("userBookings").innerHTML = rows.length ? rows.map(b => `
      <article class="ride-card">
        <div class="ride-top"><div class="ride-route">${escapeHtml(b.pickup)} <span>→</span> ${escapeHtml(b.destination)}</div><div class="ride-price">${money(b.estimatedFare)}</div></div>
        <div class="ride-meta">Ref: ${escapeHtml(b.id)}<br>${escapeHtml(b.cabType)} · ${escapeHtml(b.distanceKm)} km approx.</div>
        <span class="status-pill ${statusClass(b.status)}">${escapeHtml(b.status || "Pending")}</span>
        <div class="eta-line">${etaText(b)}</div>${progressHtml(b.status || "Pending")}
      </article>`).join("") : '<div class="empty">No bookings yet. Book your first ride to see its status here.</div>';
  } catch (err) {
    console.error(err); $("userBookings").innerHTML = '<div class="empty">Could not load bookings. Check Firestore rules.</div>';
  }
}
$("refreshUser").addEventListener("click", loadUserBookings);
async function loadAdminBookings() {
  if (!currentUser || currentProfile?.role !== "admin" || !db) return;
  try {
    const snap = await getDocs(query(collection(db, "bookings"), orderBy("createdAt", "desc")));
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $("totalBookings").textContent = rows.length;
    $("pendingBookings").textContent = rows.filter(b => b.status === "Pending").length;
    $("activeBookings").textContent = rows.filter(b => ["Confirmed","Driver assigned","Driver arriving","In progress"].includes(b.status)).length;
    $("adminBookings").innerHTML = rows.length ? rows.map(b => `
      <article class="admin-ride">
        <div>
          <h3>${escapeHtml(b.pickup)} → ${escapeHtml(b.destination)} · ${money(b.estimatedFare)}</h3>
          <p>Ref: ${escapeHtml(b.id)}</p><p>Customer: ${escapeHtml(b.userEmail || "Unknown")} · UID: ${escapeHtml(b.userId || "")}</p>
          <p>Cab: ${escapeHtml(b.cabType)} · Distance: ${escapeHtml(b.distanceKm)} km approx.</p>
          <span class="status-pill ${statusClass(b.status)}">${escapeHtml(b.status || "Pending")}</span>
        </div>
        <form class="admin-controls" data-id="${escapeHtml(b.id)}">
          <label>Status</label><select name="status">${statuses.map(s => `<option ${s === b.status ? "selected" : ""}>${s}</option>`).join("")}</select>
          <label>Driver name (optional)</label><input name="driverName" maxlength="80" value="${escapeHtml(b.driverName || "")}" placeholder="e.g. Amit Patil">
          <label>Arrival ETA in minutes (optional)</label><input name="etaMinutes" type="number" min="0" max="600" value="${b.etaMinutes ?? ""}" placeholder="e.g. 8">
          <button class="primary full" type="submit">Save update</button>
        </form>
      </article>`).join("") : '<div class="empty">No bookings have been made yet.</div>';
    document.querySelectorAll(".admin-controls").forEach(form => form.addEventListener("submit", saveAdminUpdate));
  } catch (err) {
    console.error(err); $("adminBookings").innerHTML = '<div class="empty">Could not load bookings. Verify admin role and Firestore rules.</div>';
  }
}
async function saveAdminUpdate(e) {
  e.preventDefault();
  const form = e.currentTarget, id = form.dataset.id;
  const status = form.elements.status.value;
  const driverName = form.elements.driverName.value.trim();
  const etaRaw = form.elements.etaMinutes.value.trim();
  const etaMinutes = etaRaw === "" ? null : Number(etaRaw);
  try {
    await updateDoc(doc(db, "bookings", id), { status, driverName, etaMinutes, updatedAt: serverTimestamp() });
    setNotice("adminMessage", `Updated booking ${id}. The customer can refresh their dashboard to see the new status.`, "success");
    await loadAdminBookings();
  } catch (err) {
    console.error(err); setNotice("adminMessage", "Update failed. Check Firestore rules: admins must be allowed to read and update bookings.", "error");
  }
}
$("refreshAdmin").addEventListener("click", loadAdminBookings);

if (!firebaseConfigured) {
  showView("auth");
  setNotice("authMessage", "First paste your Firebase web configuration into app.js.", "error");
}
