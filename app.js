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
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc
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

const usernameField = document.getElementById("usernameField");
const usernameInput = document.getElementById("usernameInput");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const switchAuthModeBtn = document.getElementById("switchAuthModeBtn");
const resendVerificationBtn = document.getElementById("resendVerificationBtn");
const refreshVerificationBtn = document.getElementById("refreshVerificationBtn");
const verificationControls = document.getElementById("verificationControls");

const captionInput = document.getElementById("captionInput");
const categoryInput = document.getElementById("categoryInput");
const fileInput = document.getElementById("fileInput");
const feedCategoryFilter = document.getElementById("feedCategoryFilter");

let currentUser = null;
let authMode = "login";
let unsubscribeApproved = null;

/* -------------------- helpers -------------------- */

function setStatus(el, msg, isError = false) {
  el.textContent = msg;
  el.style.color = isError ? "#ff8fa3" : "";
}

function clearStatus(el) {
  el.textContent = "";
  el.style.color = "";
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

function normalizeCategory(category) {
  const value = String(category || "").trim().toLowerCase();
  const allowed = ["funny", "animals", "relatable", "gaming", "wtf", "other"];
  return allowed.includes(value) ? value : "other";
}

function formatCategoryLabel(category) {
  const normalized = normalizeCategory(category);
  return normalized === "wtf"
    ? "WTF"
    : normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

async function refreshCurrentUser() {
  if (!auth.currentUser) return null;
  await reload(auth.currentUser);
  currentUser = auth.currentUser;
  return currentUser;
}

/* -------------------- auth ui -------------------- */

function resetAuthInputsForMode() {
  if (authMode === "login") {
    usernameInput.value = "";
  }
}

function updateAuthModeUI() {
  const isSignup = authMode === "signup";

  usernameField.classList.toggle("hidden", !isSignup);
  signupBtn.classList.toggle("hidden", !isSignup);
  loginBtn.classList.toggle("hidden", isSignup);
  verificationControls.classList.toggle("hidden", !isSignup);

  switchAuthModeBtn.textContent = isSignup
    ? "Already have an account? Log in"
    : "Need an account? Sign up";

  clearStatus(authStatus);
  resetAuthInputsForMode();
}

function openAuthPanelInLoginMode() {
  authMode = "login";
  updateAuthModeUI();
  authPanel.classList.remove("hidden");
  emailInput.focus();
}

updateAuthModeUI();

showAuthBtn.addEventListener("click", () => {
  openAuthPanelInLoginMode();
});

switchAuthModeBtn.addEventListener("click", () => {
  authMode = authMode === "login" ? "signup" : "login";
  updateAuthModeUI();

  if (authMode === "signup") {
    usernameInput.focus();
  } else {
    emailInput.focus();
  }
});

/* -------------------- username enforcement -------------------- */

async function ensureUsernameForCurrentUser() {
  if (!auth.currentUser) return false;

  const existingUsername = cleanUsername(auth.currentUser.displayName || "");
  if (existingUsername) return true;

  authMode = "signup";
  updateAuthModeUI();
  authPanel.classList.remove("hidden");

  const typedUsername = cleanUsername(usernameInput.value);

  if (!typedUsername) {
    setStatus(authStatus, "Enter a username first.", true);
    usernameInput.focus();
    return false;
  }

  if (typedUsername.length < 3) {
    setStatus(authStatus, "Username must be at least 3 characters.", true);
    usernameInput.focus();
    return false;
  }

  try {
    await updateProfile(auth.currentUser, { displayName: typedUsername });
    await refreshCurrentUser();
    setStatus(authStatus, "Username saved.");
    return true;
  } catch (err) {
    setStatus(authStatus, err.message, true);
    return false;
  }
}

/* -------------------- auth actions -------------------- */

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
      setStatus(authStatus, "Logged in, but your email is not verified yet.", true);
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
    setStatus(authStatus, "Verification email sent again. Check spam/junk/promotions too.");
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
      setStatus(uploadStatus, `Logged in as ${getUsername(auth.currentUser)}`);
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
    authMode = "login";
    updateAuthModeUI();
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
    openAuthPanelInLoginMode();
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
    authMode = "signup";
    updateAuthModeUI();
    authPanel.classList.remove("hidden");
    return;
  }

  const username = getUsername(currentUser);
  const file = fileInput.files[0];
  const caption = captionInput.value.trim();
  const category = normalizeCategory(categoryInput.value);

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

    const filePath = `uploads/${category}/${currentUser.uid}/${Date.now()}_${safeFileName(file.name)}`;
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
    categoryInput.value = "funny";
    setStatus(uploadStatus, "Upload submitted. It is now waiting for approval.");
  } catch (err) {
    setStatus(uploadStatus, err.message, true);
  }
});

/* -------------------- comment reactions -------------------- */

function updateCommentsToggleText(toggleBtn, count, expanded) {
  const label = count === 1 ? "comment" : "comments";
  toggleBtn.textContent = expanded
    ? `Hide comments (${count})`
    : `Show comments (${count})`;
}

async function getCommentReactionSummary(memeId, commentId) {
  const reactionsRef = collection(db, "memes", memeId, "comments", commentId, "reactions");
  const snapshot = await getDocs(reactionsRef);

  let likes = 0;
  let dislikes = 0;
  let myReaction = 0;

  snapshot.forEach((reactionDoc) => {
    const data = reactionDoc.data();
    if (data.value === 1) likes += 1;
    if (data.value === -1) dislikes += 1;
    if (currentUser && reactionDoc.id === currentUser.uid) {
      myReaction = data.value || 0;
    }
  });

  return { likes, dislikes, myReaction };
}

async function setCommentReaction(memeId, commentId, value) {
  if (!currentUser) {
    openAuthPanelInLoginMode();
    throw new Error("Log in to react to comments.");
  }

  await refreshCurrentUser();

  if (!currentUser.emailVerified) {
    authMode = "signup";
    updateAuthModeUI();
    authPanel.classList.remove("hidden");
    throw new Error("Verify your email before reacting to comments.");
  }

  const reactionRef = doc(db, "memes", memeId, "comments", commentId, "reactions", currentUser.uid);
  const existingSnap = await getDoc(reactionRef);

  if (existingSnap.exists() && existingSnap.data().value === value) {
    await deleteDoc(reactionRef);
    return;
  }

  await setDoc(reactionRef, {
    value,
    userId: currentUser.uid,
    updatedAt: serverTimestamp()
  });
}

/* -------------------- comments -------------------- */

async function renderComments(memeId, container, toggleBtn) {
  container.innerHTML = "";

  try {
    const commentsRef = collection(db, "memes", memeId, "comments");
    const snapshot = await getDocs(query(commentsRef, orderBy("createdAt", "desc")));

    updateCommentsToggleText(toggleBtn, snapshot.size, true);

    if (snapshot.empty) {
      container.innerHTML = '<p class="small">No comments yet.</p>';
      return;
    }

    for (const commentDoc of snapshot.docs) {
      const comment = commentDoc.data();
      const item = document.createElement("div");
      item.className = "comment";

      const meta = document.createElement("div");
      meta.className = "comment-meta";
      meta.textContent = `${comment.username || "User"} · ${formatDate(comment.createdAt)}`;

      const text = document.createElement("div");
      text.className = "comment-text";
      text.textContent = comment.text;

      const actions = document.createElement("div");
      actions.className = "comment-actions";

      const likeBtn = document.createElement("button");
      likeBtn.type = "button";
      likeBtn.className = "comment-reaction-btn";

      const dislikeBtn = document.createElement("button");
      dislikeBtn.type = "button";
      dislikeBtn.className = "comment-reaction-btn";

      const refreshReactionUI = async () => {
        const summary = await getCommentReactionSummary(memeId, commentDoc.id);

        likeBtn.textContent = `👍 Like (${summary.likes})`;
        dislikeBtn.textContent = `👎 Not like (${summary.dislikes})`;

        likeBtn.classList.toggle("active", summary.myReaction === 1);
        dislikeBtn.classList.toggle("active", summary.myReaction === -1);
      };

      likeBtn.addEventListener("click", async () => {
        try {
          await setCommentReaction(memeId, commentDoc.id, 1);
          await refreshReactionUI();
        } catch (err) {
          alert(err.message);
        }
      });

      dislikeBtn.addEventListener("click", async () => {
        try {
          await setCommentReaction(memeId, commentDoc.id, -1);
          await refreshReactionUI();
        } catch (err) {
          alert(err.message);
        }
      });

      actions.append(likeBtn, dislikeBtn);
      item.append(meta, text, actions);
      container.appendChild(item);

      await refreshReactionUI();
    }
  } catch (err) {
    container.innerHTML = `<p class="small">Could not load comments: ${err.message}</p>`;
  }
}

async function postComment(memeId, inputEl, statusEl, commentsContainer, toggleBtn) {
  if (!currentUser) {
    setStatus(statusEl, "Log in to comment.", true);
    openAuthPanelInLoginMode();
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
    authMode = "signup";
    updateAuthModeUI();
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
    await renderComments(memeId, commentsContainer, toggleBtn);
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

  const commentsToggle = node.querySelector(".comments-toggle");
  const commentsBody = node.querySelector(".comments-body");
  const commentsList = node.querySelector(".comments-list");
  const commentForm = node.querySelector(".comment-form");
  const commentInput = node.querySelector(".comment-input");
  const commentStatus = node.querySelector(".comment-status");

  image.src = meme.imageUrl;
  image.alt = meme.caption || "Meme image";
  caption.textContent = meme.caption;
  category.textContent = formatCategoryLabel(meme.category);
  small.textContent = formatDate(meme.createdAt);

  updateCommentsToggleText(commentsToggle, 0, false);

  let commentsLoaded = false;

  commentsToggle.addEventListener("click", async () => {
    const isHidden = commentsBody.classList.contains("hidden");

    if (isHidden) {
      commentsBody.classList.remove("hidden");

      if (!commentsLoaded) {
        await renderComments(id, commentsList, commentsToggle);
        commentsLoaded = true;
      } else {
        const countMatch = commentsToggle.textContent.match(/\((\d+)\)/);
        const count = countMatch ? Number(countMatch[1]) : 0;
        updateCommentsToggleText(commentsToggle, count, true);
      }
    } else {
      commentsBody.classList.add("hidden");
      const countMatch = commentsToggle.textContent.match(/\((\d+)\)/);
      const count = countMatch ? Number(countMatch[1]) : 0;
      updateCommentsToggleText(commentsToggle, count, false);
    }
  });

  commentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    commentsBody.classList.remove("hidden");
    await postComment(id, commentInput, commentStatus, commentsList, commentsToggle);
    commentsLoaded = true;

    const countMatch = commentsToggle.textContent.match(/\((\d+)\)/);
    const count = countMatch ? Number(countMatch[1]) : 0;
    updateCommentsToggleText(commentsToggle, count, true);
  });

  return node;
}

function listenForApprovedMemes() {
  if (unsubscribeApproved) unsubscribeApproved();

  const selectedValue = feedCategoryFilter.value;
  const selectedCategory = normalizeCategory(selectedValue);
  let q;

  if (selectedValue === "all") {
    q = query(
      collection(db, "memes"),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc")
    );
  } else {
    q = query(
      collection(db, "memes"),
      where("status", "==", "approved"),
      where("category", "==", selectedCategory),
      orderBy("createdAt", "desc")
    );
  }

  unsubscribeApproved = onSnapshot(
    q,
    (snapshot) => {
      feed.innerHTML = "";

      if (snapshot.empty) {
        const selectedLabel = selectedValue === "all"
          ? "No approved memes yet."
          : `No approved memes in ${formatCategoryLabel(selectedValue)} yet.`;

        feed.innerHTML = `<div class="panel"><p class="muted">${selectedLabel}</p></div>`;
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

feedCategoryFilter.addEventListener("change", () => {
  listenForApprovedMemes();
});

listenForApprovedMemes();