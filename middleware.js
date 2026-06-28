const PUBLIC_PATHS = [
  "/login.html",
  "/style.css",
  "/script.js",
  "/404.html",
  "/robots.txt",
  "/sitemap.xml",
  "/api/login",
  "/api/logout"
];

function isPublic(pathname) {
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/assets/fonts/") || pathname.startsWith("/assets/icons/") || pathname.startsWith("/assets/images/");
}

async function hmac(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function isAuthenticated(request) {
  const secret = process.env.SITE_PASSWORD;
  if (!secret) return false;

  const cookie = request.cookies.get("library_auth")?.value;
  if (!cookie || !cookie.includes(".")) return false;

  const [timestamp, signature] = cookie.split(".");
  const age = Date.now() - Number(timestamp);
  if (!Number.isFinite(age) || age < 0 || age > 1000 * 60 * 60 * 24 * 30) return false;

  const expected = await hmac(timestamp, secret);
  return signature === expected;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return;

  if (await isAuthenticated(request)) {
    if (pathname === "/login.html") {
      return Response.redirect(new URL("/", request.url));
    }
    return;
  }

  const loginUrl = new URL("/login.html", request.url);
  return Response.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"]
};
