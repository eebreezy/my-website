import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  reload
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const showAuthBtn = document.getElementById("showAuthBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authPanel = document.getElementById("authPanel");
const authStatus = document.getElementById("authStatus");
const uploadStatus = document.getElementById("uploadStatus");
const uploadForm = document.getElementById("uploadForm");
const feed = document.getElementById("feed");

const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");

const captionInput = document.getElementById("captionInput");
const categoryInput = document.getElementById("categoryInput");
const fileInput = document.getElementById("fileInput");

let currentUser = null;

/* -------------------- helpers -------------------- */

function setStatus(el, msg, isError = false) {
  el.textContent = msg;
  el.style.color = isError ? "#ff8fa3" : "";
}

function formatDate(ts) {
  if (!ts?.toDate) return "Just now";
  return ts.toDate().toLocaleString();
}

function safeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function cleanUsername(name) {
  return (name || "").trim().replace(/\s+/g, " ");
}

function getUsername(user) {
  return cleanUsername(user?.displayName || "") || "User";
}

async function refreshCurrentUser() {
  if (!auth.currentUser) return null;
  await reload(auth.currentUser);
  currentUser = auth.currentUser;
  return currentUser;
}

/* -------------------- inject username + verification controls -------------------- */

function ensureUsernameField() {
  let usernameInput = document.getElementById("usernameInput");
  if (usernameInput) return usernameInput;

  const emailLabel = emailInput.closest("label");
  const usernameLabel = document.createElement("label");
  usernameLabel.innerHTML = `
    Username
    <input
      id="usernameInput"
      type="text"
      maxlength="30"
      autocomplete="username"
      placeholder="Choose a username"
    >
  `;

  if (emailLabel && authForm) {
    authForm.insertBefore(usernameLabel, emailLabel);
  } else if (authForm) {
    authForm.prepend(usernameLabel);
  }

  return document.getElementById("usernameInput");
}

function ensureVerificationButtons() {
  let controls = document.getElementById("verificationControls");
  if (controls) return controls;

  controls = document.createElement("div");
  controls.id = "verificationControls";
  controls.className = "auth-actions";
  controls.style.marginTop = "8px";
  controls.innerHTML = `
    <button type="button" id="resendVerificationBtn" class="secondary">Resend verification email</button>
    <button type="button" id="refreshVerificationBtn" class="secondary">I've verified, refresh</button>
  `;

  authStatus.insertAdjacentElement("beforebegin", controls);
  return controls;
}

const usernameInput = ensureUsernameField();
ensureVerificationButtons();

const resendVerificationBtn = document.getElementById("resendVerificationBtn");
const refreshVerificationBtn = document.getElementById("refreshVerificationBtn");

/* -------------------- username enforcement -------------------- */

async function ensureUsernameForCurrentUser() {
  if (!auth.currentUser) return false;

  const existingUsername = cleanUsername(auth.currentUser.displayName || "");
  if (existingUsername) return true;

  const typedUsername = cleanUsername(usernameInput.value);

  if (!typedUsername) {
    authPanel.classList.remove("hidden");
    setStatus(authStatus, "Enter a username first.", true);
    return false;
  }

  if (typedUsername.length < 3) {
    authPanel.classList.remove("hidden");
    setStatus(authStatus, "Username must be at least 3 characters.", true);
    return false;
  }

  try {
    await updateProfile(auth.currentUser, { displayName: typedUsername });
    await refreshCurrentUser();
    setStatus(authStatus, "Username saved.");
    return true;
  } catch (err) {
    authPanel.classList.remove("hidden");
    setStatus(authStatus, err.message, true);
    return false;
  }
}

/* -------------------- auth UI -------------------- */

showAuthBtn.addEventListener("click", () => {
  authPanel.classList.toggle("hidden");
});

signupBtn.addEventListener("click", async () => {
  const username = cleanUsername(usernameInput.value);
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!username) {
    setStatus(authStatus, "Username is required for sign up.", true);
    return;
  }

  if (username.length < 3) {
    setStatus(authStatus, "Username must be at least 3 characters.", true);
    return;
  }

  try {
    setStatus(authStatus, "Creating account...");
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(cred.user, { displayName: username });
    await sendEmailVerification(cred.user);
    await refreshCurrentUser();

    setStatus(
      authStatus,
      "Account created. Verification email sent. Check spam/junk if you do not see it."
    );
  } catch (err) {
    setStatus(authStatus, err.message, true);
  }
});

loginBtn.addEventListener("click", async () => {
  try {
    setStatus(authStatus, "Logging in...");
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    await refreshCurrentUser();

    const hasUsername = await ensureUsernameForCurrentUser();
    if (!hasUsername) return;

    if (!auth.currentUser.emailVerified) {
      setStatus(
        authStatus,
        "Logged in, but your email is not verified yet. Check your inbox or spam, then click refresh.",
        true
      );
    } else {
      setStatus(authStatus, "Logged in.");
      authPanel.classList.add("hidden");
    }
  } catch (err) {
    setStatus(authStatus, err.message, true);
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

resendVerificationBtn.addEventListener("click", async () => {
  try {
    if (!auth.currentUser) {
      setStatus(authStatus, "Log in first.", true);
      return;
    }

    const hasUsername = await ensureUsernameForCurrentUser();
    if (!hasUsername) return;

    await refreshCurrentUser();

    if (auth.currentUser.emailVerified) {
      setStatus(authStatus, "Your email is already verified.");
      return;
    }

    await sendEmailVerification(auth.currentUser);
    setStatus(
      authStatus,
      "Verification email sent again. Check spam/junk/promotions too."
    );
  } catch (err) {
    setStatus(authStatus, err.message, true);
  }
});

refreshVerificationBtn.addEventListener("click", async () => {
  try {
    if (!auth.currentUser) {
      setStatus(authStatus, "Log in first.", true);
      return;
    }

    const hasUsername = await ensureUsernameForCurrentUser();
    if (!hasUsername) return;

    await refreshCurrentUser();

    if (auth.currentUser.emailVerified) {
      setStatus(authStatus, "Email verified. You can now upload and comment.");
      authPanel.classList.add("hidden");
      const username = getUsername(auth.currentUser);
      setStatus(uploadStatus, `Logged in as ${username}`);
    } else {
      setStatus(
        authStatus,
        "Still not verified yet. Open the email link first, then click refresh again.",
        true
      );
    }
  } catch (err) {
    setStatus(authStatus, err.message, true);
  }
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  logoutBtn.classList.toggle("hidden", !user);
  showAuthBtn.classList.toggle("hidden", !!user);

  if (!user) {
    setStatus(uploadStatus, "Log in to upload and comment.");
    return;
  }

  await refreshCurrentUser();

  const hasUsername = await ensureUsernameForCurrentUser();
  if (!hasUsername) {
    setStatus(uploadStatus, "Add a username to continue.", true);
    return;
  }

  const username = getUsername(auth.currentUser);

  if (!auth.currentUser.emailVerified) {
    setStatus(
      uploadStatus,
      `Logged in as ${username}. Verify your email before uploading or commenting.`,
      true
    );
  } else {
    setStatus(uploadStatus, `Logged in as ${username}`);
  }
});

/* -------------------- uploads -------------------- */

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) {
    setStatus(uploadStatus, "Please log in first.", true);
    authPanel.classList.remove("hidden");
    return;
  }

  await refreshCurrentUser();

  const hasUsername = await ensureUsernameForCurrentUser();
  if (!hasUsername) {
    setStatus(uploadStatus, "Please add a username before uploading.", true);
    return;
  }

  if (!currentUser.emailVerified) {
    setStatus(uploadStatus, "Please verify your email before uploading.", true);
    authPanel.classList.remove("hidden");
    return;
  }

  const username = getUsername(currentUser);
  const file = fileInput.files[0];
  const caption = captionInput.value.trim();
  const category = categoryInput.value;

  if (!file) {
    setStatus(uploadStatus, "Choose an image first.", true);
    return;
  }

  if (!caption) {
    setStatus(uploadStatus, "Caption is required.", true);
    return;
  }

  try {
    setStatus(uploadStatus, "Uploading image...");

    const filePath = `uploads/${currentUser.uid}/${Date.now()}_${safeFileName(file.name)}`;
    const storageRef = ref(storage, filePath);

    await uploadBytes(storageRef, file, { contentType: file.type });
    const imageUrl = await getDownloadURL(storageRef);

    setStatus(uploadStatus, "Saving post for review...");

    await addDoc(collection(db, "memes"), {
      imageUrl,
      storagePath: filePath,
      caption,
      category,
      status: "pending",
      createdAt: serverTimestamp(),
      uploadedBy: currentUser.uid,
      uploaderUsername: username,
      likesCount: 0
    });

    uploadForm.reset();
    setStatus(uploadStatus, "Upload submitted. It is now waiting for approval.");
  } catch (err) {
    setStatus(uploadStatus, err.message, true);
  }
});

/* -------------------- comments -------------------- */

async function renderComments(memeId, container) {
  container.innerHTML = "";

  try {
    const commentsRef = collection(db, "memes", memeId, "comments");
    const snapshot = await getDocs(query(commentsRef, orderBy("createdAt", "desc")));

    if (snapshot.empty) {
      container.innerHTML = '<p class="small">No comments yet.</p>';
      return;
    }

    snapshot.forEach((commentDoc) => {
      const comment = commentDoc.data();
      const item = document.createElement("div");
      item.className = "comment";

      const meta = document.createElement("div");
      meta.className = "comment-meta";
      meta.textContent = `${comment.username || "User"} · ${formatDate(comment.createdAt)}`;

      const text = document.createElement("div");
      text.textContent = comment.text;

      item.append(meta, text);
      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = `<p class="small">Could not load comments: ${err.message}</p>`;
  }
}

async function postComment(memeId, inputEl, statusEl, commentsContainer) {
  if (!currentUser) {
    setStatus(statusEl, "Log in to comment.", true);
    authPanel.classList.remove("hidden");
    return;
  }

  await refreshCurrentUser();

  const hasUsername = await ensureUsernameForCurrentUser();
  if (!hasUsername) {
    setStatus(statusEl, "Please add a username before commenting.", true);
    return;
  }

  if (!currentUser.emailVerified) {
    setStatus(statusEl, "Please verify your email before commenting.", true);
    authPanel.classList.remove("hidden");
    return;
  }

  const text = inputEl.value.trim();

  if (!text) {
    setStatus(statusEl, "Write a comment first.", true);
    return;
  }

  try {
    setStatus(statusEl, "Posting...");

    await addDoc(collection(db, "memes", memeId, "comments"), {
      text,
      createdAt: serverTimestamp(),
      userId: currentUser.uid,
      username: getUsername(currentUser)
    });

    inputEl.value = "";
    setStatus(statusEl, "Comment posted.");
    await renderComments(memeId, commentsContainer);
  } catch (err) {
    setStatus(statusEl, err.message, true);
  }
}

/* -------------------- feed -------------------- */

function buildCard(id, meme) {
  const template = document.getElementById("memeCardTemplate");
  const node = template.content.firstElementChild.cloneNode(true);

  const image = node.querySelector(".meme-image");
  const caption = node.querySelector(".caption");
  const category = node.querySelector(".category");
  const small = node.querySelector(".small");
  const commentsList = node.querySelector(".comments-list");
  const commentForm = node.querySelector(".comment-form");
  const commentInput = node.querySelector(".comment-input");
  const commentStatus = node.querySelector(".comment-status");

  image.src = meme.imageUrl;
  image.alt = meme.caption || "Meme image";
  caption.textContent = meme.caption;
  category.textContent = meme.category;
  small.textContent = formatDate(meme.createdAt);

  renderComments(id, commentsList);

  commentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await postComment(id, commentInput, commentStatus, commentsList);
  });

  return node;
}

function listenForApprovedMemes() {
  const q = query(
    collection(db, "memes"),
    where("status", "==", "approved"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(
    q,
    (snapshot) => {
      feed.innerHTML = "";

      if (snapshot.empty) {
        feed.innerHTML = '<div class="panel"><p class="muted">No approved memes yet.</p></div>';
        return;
      }

      snapshot.forEach((memeDoc) => {
        feed.appendChild(buildCard(memeDoc.id, memeDoc.data()));
      });
    },
    (err) => {
      feed.innerHTML = `<div class="panel"><p class="status">${err.message}</p></div>`;
    }
  );
}

listenForApprovedMemes();