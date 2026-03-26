import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [, , email, serviceAccountPath] = process.argv;

if (!email || !serviceAccountPath) {
  console.error('Usage: node scripts/setAdminClaim.js "your@email.com" "/full/path/to/serviceAccountKey.json"');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

initializeApp({
  credential: cert(serviceAccount)
});

async function run() {
  const auth = getAuth();
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { admin: true });
  console.log(`Admin claim set for ${email} (${user.uid})`);
  console.log("Ask the user to sign out and sign back in so the new token claim is picked up.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
