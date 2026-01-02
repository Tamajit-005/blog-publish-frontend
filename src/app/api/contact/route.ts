import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { sendContactFormEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    // Get session from iron-session
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    
    if (!session?.user?.sub || !session.isLoggedIn) {
      return NextResponse.json(
        { error: "You must be logged in to send a message. Please register or login first." },
        { status: 401 }
      );
    }

    const { name, message } = await req.json();
    
    // Use logged-in email from session
    const email = session.user.email;

    // Validation
    if (!name || !message) {
      return NextResponse.json(
        { error: "Name and message are required" },
        { status: 400 }
      );
    }

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: "Name must be between 2 and 100 characters" },
        { status: 400 }
      );
    }

    if (message.length < 10 || message.length > 5000) {
      return NextResponse.json(
        { error: "Message must be between 10 and 5000 characters" },
        { status: 400 }
      );
    }

    console.log("Contact form submission:", { 
      name, 
      email,
      user: session.user.email,
      username: session.user.username 
    });

    await sendContactFormEmail({
      name: name.trim(),
      email: email,
      message: message.trim(),
    });

    return NextResponse.json({
      message: "Message sent successfully! We'll get back to you soon.",
    });
  } catch (err: any) {
    console.error("Contact form error:", err);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}
