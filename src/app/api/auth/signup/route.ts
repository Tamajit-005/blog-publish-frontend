import { NextRequest, NextResponse } from "next/server";
import { ManagementClient } from "auth0";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";

const management = new ManagementClient({
  domain: process.env.AUTH0_ISSUER_BASE_URL!.replace("https://", ""),
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const { email, password, username } = await req.json();

    // Validation
    if (!email || !password || !username) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json(
        { error: "Username must be 3-30 characters" },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: "Username: letters, numbers, underscore only" },
        { status: 400 }
      );
    }

    console.log("Creating Auth0 user...");
    console.log(" Email:", email);
    console.log(" Username (case-sensitive):", username);

    // Step 1: Create user in Auth0
    const auth0User = await management.users.create({
      email,
      password,
      username: username.toLowerCase(),
      connection: "Username-Password-Authentication",
      user_metadata: {
        display_username: username, 
      },
      email_verified: false,
    });

    const userId = auth0User.data?.user_id || auth0User.user_id;
    
    console.log("Auth0 user created:", userId);
    console.log("Username saved to user_metadata:", username);

    // Step 2: Create user in MongoDB immediately
    try {
      await connectToDatabase();
      
      const mongoUser = await User.create({
        auth0Id: userId,
        email: email,
        username: username, 
        role: "user",
      });

      console.log("MongoDB user created:", mongoUser.username);
      console.log("MongoDB user ID:", mongoUser._id);
      
    } catch (mongoError: any) {
      console.error("MongoDB creation failed:", mongoError);
      
      // Auth0 user exists but MongoDB failed - log warning
      console.warn("Auth0 user exists but MongoDB sync failed. Will retry on first login.");
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    console.error("Error details:", error.message);

    let errorMessage = "Failed to create account";

    if (error.statusCode === 409 || error.message?.includes("user already exists")) {
      errorMessage = "This email or username is already taken";
    } else if (error.message?.includes("password")) {
      errorMessage = "Password too weak. Use 8+ characters with letters & numbers";
    } else if (error.message?.includes("email")) {
      errorMessage = "Invalid email address";
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: error.statusCode || 500 }
    );
  }
}
