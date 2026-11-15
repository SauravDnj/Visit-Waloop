// One-time helper: prints a GOOGLE_REFRESH_TOKEN for the Google account whose calendar hosts demos.
//
// Usage:
//   1. Put GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local (OAuth client type: "Desktop app").
//   2. npm run google:token
//   3. Open the printed URL, sign in with the WALOOP Google account, allow access.
//   4. Copy the printed refresh token into .env.local as GOOGLE_REFRESH_TOKEN.

import http from "node:http";
import { readFileSync, existsSync } from "node:fs";

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv(".env.local");

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local first.");
  process.exit(1);
}

const PORT = 53682;
const redirectUri = `http://127.0.0.1:${PORT}/callback`;
const scopes = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/gmail.send",
];

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: scopes.join(" "),
  });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== "/callback") return res.writeHead(404).end();

  const code = url.searchParams.get("code");
  if (!code) {
    res.end("No code received: " + (url.searchParams.get("error") ?? "unknown error"));
    return server.close();
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = await tokenRes.json();

  if (!data.refresh_token) {
    res.end("Google did not return a refresh token. See the terminal.");
    console.error("Token response:", data);
  } else {
    res.end("Done! Return to the terminal and copy your refresh token.");
    console.log("\nAdd this line to .env.local:\n");
    console.log(`GOOGLE_REFRESH_TOKEN=${data.refresh_token}\n`);
  }
  server.close();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Open this URL in your browser and sign in with the account that hosts demos:\n");
  console.log(authUrl + "\n");
});
