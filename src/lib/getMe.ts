export async function getMe(): Promise<any | null> {
  if (typeof window === "undefined") return null;

  const jwt = localStorage.getItem("jwt");
  if (!jwt) return null;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=*`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      }
    );

    if (!res.ok) return null;

    return await res.json();
  } catch {
    return null;
  }
}
