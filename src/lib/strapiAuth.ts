// src/lib/strapiAuth.ts
import { saveAuthData } from "./authStore";

const STRAPI_BASE =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

/* -------------------------------------------------------
   Utility: Parse server response
------------------------------------------------------- */
async function parseResponse(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/* -------------------------------------------------------
   REGISTER USER
------------------------------------------------------- */
export async function registerUser(
  username: string,
  email: string,
  password: string
) {
  const res = await fetch(`${STRAPI_BASE}/api/auth/local/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    throw new Error(data?.error?.message || "Registration failed");
  }

  // Auto-login after register
  saveAuthData(data.jwt, data.user);

  return data;
}

/* -------------------------------------------------------
   LOGIN USER
------------------------------------------------------- */
export async function loginUser(identifier: string, password: string) {
  const res = await fetch(`${STRAPI_BASE}/api/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    throw new Error(data?.error?.message || "Invalid credentials.");
  }

  // Save same as register
  saveAuthData(data.jwt, data.user);

  return data;
}

/* -------------------------------------------------------
   LOGOUT
------------------------------------------------------- */
export function logoutUser() {
  localStorage.removeItem("jwt");
  localStorage.removeItem("user");
}

/* -------------------------------------------------------
   UTILITIES
------------------------------------------------------- */
export function getAuthToken() {
  return localStorage.getItem("jwt");
}

export function getUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

/* -------------------------------------------------------
   getAuthData() — REQUIRED by Create page
------------------------------------------------------- */
export function getAuthData() {
  const jwt = localStorage.getItem("jwt");
  const userStr = localStorage.getItem("user");

  if (!jwt || !userStr) return null;

  let user;
  try {
    user = JSON.parse(userStr);
  } catch {
    return null;
  }

  return { jwt, user };
}
