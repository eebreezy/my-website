# OmFunny Firebase backend setup

This pack gives you a moderated meme site backend for a static website:

- users sign up / log in
- users upload image + caption
- uploads go to **pending**
- public feed shows only **approved** posts
- users can add comments on approved posts
- private admin page lets you approve / reject uploads

## Folder layout

- `public/` — upload this to your website
- `firestore.rules` — Firestore security rules
- `storage.rules` — Storage security rules
- `scripts/setAdminClaim.js` — run once to make your account admin
- `package.json` — install the Firebase Admin SDK for the admin-claim script

## Firebase services to enable

In your Firebase project, enable:

1. Authentication → Email/Password
2. Firestore Database
3. Storage

Firebase's docs cover web setup, Auth, Firestore, Storage uploads, and security rules. They also document custom claims for role-based admin access and note that creating a default Storage bucket can prompt a Blaze-plan upgrade. citeturn403886search20turn403886search11turn403886search3turn403886search1turn403886search9

## Setup steps

### 1) Create Firebase web app
From the Firebase console, create a web app and copy your config object.

Open:

- `public/firebase-config.example.js`

Copy it to:

- `public/firebase-config.js`

Then paste your real Firebase config into that file.

### 2) Set Firestore rules
In the Firebase console, paste the contents of `firestore.rules`.

These rules do the following:
- public can read only approved memes
- signed-in users can create pending memes
- signed-in users can comment only on approved memes
- only admin can approve / reject / delete

### 3) Set Storage rules
In the Firebase console, paste the contents of `storage.rules`.

These rules do the following:
- only signed-in users can upload
- only image files are allowed
- max file size is 5 MB
- uploads must go inside `uploads/{uid}/...`

### 4) Make yourself admin
Install Node.js on your computer, then in this project folder run:

```bash
npm install
```

Create a Firebase service account key:
- Firebase console → Project settings → Service accounts → Generate new private key

Save that JSON file somewhere safe.

Then run:

```bash
node scripts/setAdminClaim.js "your-admin@email.com" "/full/path/to/serviceAccountKey.json"
```

This script sets the `admin: true` custom claim on your account. Firebase documents custom claims for role-based access with Security Rules. citeturn403886search1turn403886search16

### 5) Deploy your site
Upload everything inside `public/` to your website root.

Files:
- `index.html` — public feed + upload + comments
- `admin.html` — private moderation page
- `style.css`
- `app.js`
- `admin.js`
- `firebase-config.js` — your real config

## Notes

- This is a **no-build static setup** using the official Firebase web SDK from Google's CDN.
- Pending posts are not shown on the public feed.
- Comments are stored under each meme document as a subcollection.
- Upload approval and rejection happen from `admin.html`.

## Data model

### Collection: `memes`
Fields:
- `imageUrl`
- `storagePath`
- `caption`
- `category`
- `status` (`pending`, `approved`, `rejected`)
- `createdAt`
- `uploadedBy`
- `uploaderEmail`
- `likesCount`

### Subcollection: `memes/{memeId}/comments`
Fields:
- `text`
- `createdAt`
- `userId`
- `userEmail`

## Hosting reminder

GitHub Pages can host the site files, but it is static hosting. Shared uploads/comments need Firebase, not GitHub alone. Firebase's web docs show initialization, uploads, and Firestore document reads/writes for this architecture. citeturn403886search20turn403886search3turn403886search0
