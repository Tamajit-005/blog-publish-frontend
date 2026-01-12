require("dotenv").config({ path: ".env.local" });

async function testStrapiConnection() {
  const strapiUrl = `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/blogs`;

  console.log("Testing Strapi connection...");
  console.log("URL:", strapiUrl);

  // Test POST without authentication (Public role)
  console.log("\n--- Test: POST without token ---");
  try {
    const response = await fetch(strapiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          title: "Test Blog Post " + Date.now(),
          slug: "test-blog-" + Date.now(),
          description: "This is a test blog post",
          content: "# Test Content\n\nThis is test content for the blog.",
        },
      }),
    });

    const text = await response.text();
    console.log("Status:", response.status);
    
    if (response.ok) {
      console.log("✅ SUCCESS! Blog created");
      const data = JSON.parse(text);
      console.log("Created blog ID:", data.data?.id);
      console.log("Response:", JSON.stringify(data, null, 2));
    } else {
      console.log("❌ FAILED");
      console.log("Response:", text);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testStrapiConnection();
