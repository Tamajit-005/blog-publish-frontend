require("dotenv").config({ path: ".env.local" });

async function testStrapiAuthenticatedPost() {
  const url = `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/blogs`;

  console.log("Testing authenticated Strapi POST...");
  console.log("URL:", url);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify({
      data: {
        title: "Auth Test Blog " + Date.now(),
        slug: "auth-test-" + Date.now(),
        description: "Authenticated test blog",
        content: "# Auth Test\n\nThis blog was created with an API token.",
        publishedAt: new Date().toISOString(),
      },
    }),
  });

  const text = await response.text();
  console.log("Status:", response.status);

  if (!response.ok) {
    console.log("❌ FAILED");
    console.log(text);
    return;
  }

  console.log("✅ SUCCESS");
  console.log(JSON.stringify(JSON.parse(text), null, 2));
}

testStrapiAuthenticatedPost();
