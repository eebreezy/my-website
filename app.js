import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
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
  doc,
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

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");

const captionInput = document.getElementById("captionInput");
const categoryInput = document.getElementById("categoryInput");
const fileInput = document.getElementById("fileInput");

let currentUser = null;

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

showAuthBtn.addEventListener("click", () => {
  authPanel.classList.toggle("hidden");
});

signupBtn.addEventListener("click", async () => {
  try {
    setStatus(authStatus, "Creating account...");
    await createUserWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    setStatus(authStatus, "Account created. You are logged in.");
    authPanel.classList.add("hidden");
  } catch (err) {
    setStatus(authStatus, err.message, true);
  }
});

loginBtn.addEventListener("click", async () => {
  try {
    setStatus(authStatus, "Logging in...");
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    setStatus(authStatus, "Logged in.");
    authPanel.classList.add("hidden");
  } catch (err) {
    setStatus(authStatus, err.message, true);
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  logoutBtn.classList.toggle("hidden", !user);
  showAuthBtn.classList.toggle("hidden", !!user);
  if (!user) {
    setStatus(uploadStatus, "Log in to upload and comment.");
  } else {
    setStatus(uploadStatus, `Logged in as ${user.email}`);
  }
});

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) {
    setStatus(uploadStatus, "Please log in first.", true);
    authPanel.classList.remove("hidden");
    return;
  }

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
      uploaderEmail: currentUser.email || "",
      likesCount: 0
    });

    uploadForm.reset();
    setStatus(uploadStatus, "Upload submitted. It is now waiting for approval.");
  } catch (err) {
    setStatus(uploadStatus, err.message, true);
  }
});

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
      meta.textContent = `${comment.userEmail || "User"} · ${formatDate(comment.createdAt)}`;

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
      userEmail: currentUser.email || ""
    });
    inputEl.value = "";
    setStatus(statusEl, "Comment posted.");
    await renderComments(memeId, commentsContainer);
  } catch (err) {
    setStatus(statusEl, err.message, true);
  }
}

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

  onSnapshot(q, (snapshot) => {
    feed.innerHTML = "";
    if (snapshot.empty) {
      feed.innerHTML = '<div class="panel"><p class="muted">No approved memes yet.</p></div>';
      return;
    }

    snapshot.forEach((memeDoc) => {
      feed.appendChild(buildCard(memeDoc.id, memeDoc.data()));
    });
  }, (err) => {
    feed.innerHTML = `<div class="panel"><p class="status">${err.message}</p></div>`;
  });
}

listenForApprovedMemes();
