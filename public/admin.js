import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const authPanel = document.getElementById("authPanel");
const authStatus = document.getElementById("authStatus");
const adminStatus = document.getElementById("adminStatus");
const pendingFeed = document.getElementById("pendingFeed");
const logoutBtn = document.getElementById("logoutBtn");

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");

let unsubscribePending = null;

function setStatus(el, msg, isError = false) {
  el.textContent = msg;
  el.style.color = isError ? "#ff8fa3" : "";
}

function formatDate(ts) {
  if (!ts?.toDate) return "Just now";
  return ts.toDate().toLocaleString();
}

loginBtn.addEventListener("click", async () => {
  try {
    setStatus(authStatus, "Logging in...");
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    setStatus(authStatus, "Logged in.");
  } catch (err) {
    setStatus(authStatus, err.message, true);
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    authPanel.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    pendingFeed.innerHTML = "";
    setStatus(adminStatus, "Log in with your admin account.");
    if (unsubscribePending) unsubscribePending();
    return;
  }

  await user.getIdToken(true);
  const token = await user.getIdTokenResult();
  const isAdmin = token.claims.admin === true;

  if (!isAdmin) {
    authPanel.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    pendingFeed.innerHTML = "";
    setStatus(adminStatus, "This account is not an admin. Set the custom admin claim first.", true);
    if (unsubscribePending) unsubscribePending();
    return;
  }

  authPanel.classList.add("hidden");
  logoutBtn.classList.remove("hidden");
  setStatus(adminStatus, `Logged in as admin: ${user.email}`);
  listenForPendingMemes();
});

async function moderate(id, nextStatus) {
  try {
    await updateDoc(doc(db, "memes", id), { status: nextStatus });
  } catch (err) {
    setStatus(adminStatus, err.message, true);
  }
}

async function removeMeme(id) {
  try {
    await deleteDoc(doc(db, "memes", id));
  } catch (err) {
    setStatus(adminStatus, err.message, true);
  }
}

function buildPendingCard(id, meme) {
  const template = document.getElementById("pendingCardTemplate");
  const node = template.content.firstElementChild.cloneNode(true);

  node.querySelector(".meme-image").src = meme.imageUrl;
  node.querySelector(".meme-image").alt = meme.caption || "Pending meme";
  node.querySelector(".caption").textContent = meme.caption;
  node.querySelector(".category").textContent = meme.category;
  node.querySelector(".uploader").textContent = `${meme.uploaderEmail || "Unknown"} · ${formatDate(meme.createdAt)}`;

  node.querySelector(".approve-btn").addEventListener("click", () => moderate(id, "approved"));
  node.querySelector(".reject-btn").addEventListener("click", () => moderate(id, "rejected"));
  node.querySelector(".delete-btn").addEventListener("click", () => removeMeme(id));

  return node;
}

function listenForPendingMemes() {
  if (unsubscribePending) unsubscribePending();

  const q = query(
    collection(db, "memes"),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );

  unsubscribePending = onSnapshot(q, (snapshot) => {
    pendingFeed.innerHTML = "";
    if (snapshot.empty) {
      pendingFeed.innerHTML = '<div class="panel"><p class="muted">No pending memes right now.</p></div>';
      return;
    }

    snapshot.forEach((memeDoc) => {
      pendingFeed.appendChild(buildPendingCard(memeDoc.id, memeDoc.data()));
    });
  }, (err) => {
    setStatus(adminStatus, err.message, true);
  });
}
