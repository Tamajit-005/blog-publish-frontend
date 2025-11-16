export function saveAuthData(jwt: string, user: any) {
  if (typeof window === "undefined") return;

  localStorage.setItem("jwt", jwt);
  localStorage.setItem("user", JSON.stringify(user));
}

export function getAuthData() {
  if (typeof window === "undefined") return null;

  const jwt = localStorage.getItem("jwt");
  const user = localStorage.getItem("user");

  if (!jwt || !user) return null;

  return { jwt, user: JSON.parse(user) };
}

export function clearAuthData() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("jwt");
  localStorage.removeItem("user");
}
