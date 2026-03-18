import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "PALETTE Publisher <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "tamajitsaha05@gmail.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/* ───────────────── CONTACT FORM ───────────────── */

export async function sendContactFormEmail(data: {
  name: string;
  email: string;
  message: string;
}) {
  try {
    console.log("Sending contact form email to admin...");
    console.log("   From:", data.name, `<${data.email}>`);

    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      replyTo: data.email,
      subject: `New Contact Form Message from ${data.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #f3f4f6;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: white;
              border-radius: 12px;
              padding: 30px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            h2 { 
              color: #14b8a6; 
              margin-top: 0;
              border-bottom: 3px solid #14b8a6;
              padding-bottom: 10px;
            }
            .field { 
              margin: 20px 0; 
              padding: 15px;
              background-color: #f9fafb;
              border-radius: 8px;
              border-left: 4px solid #14b8a6;
            }
            .label { 
              font-weight: 600; 
              color: #374151;
              display: block;
              margin-bottom: 8px;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .value { 
              color: #111827;
              word-wrap: break-word;
              font-size: 16px;
            }
            .message-box {
              background-color: #f3f4f6;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #14b8a6;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
            .reply-button {
              display: inline-block;
              background-color: #14b8a6;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>📧 New Contact Form Submission</h2>
            
            <div class="field">
              <span class="label">From:</span>
              <span class="value">${data.name}</span>
            </div>
            
            <div class="field">
              <span class="label">Email Address:</span>
              <span class="value">${data.email}</span>
            </div>
            
            <div class="message-box">
              <span class="label">Message:</span>
              <p class="value" style="margin: 10px 0 0 0; white-space: pre-wrap; line-height: 1.6;">${data.message}</p>
            </div>
            
            <div class="footer">
              <p style="margin: 0 0 10px 0;">
                <strong>Reply directly to this message:</strong>
              </p>
              <a href="mailto:${data.email}" class="reply-button">
                Reply to ${data.name}
              </a>
              <p style="margin-top: 20px; color: #9ca3af; font-size: 13px;">
                This message was sent via the PALETTE Publisher contact form.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (response.error) {
      console.error("Email failed:", response.error);
      throw new Error(response.error.message);
    }

    console.log("Contact email sent to admin:", response.data?.id);
  } catch (error: any) {
    console.error("Contact email failed:", error.message);
    throw error;
  }
}

/* ───────────────── BLOG WORKFLOW EMAILS ───────────────── */

type BlogEmailPayload =
  | { type: "blog_submitted";   blogTitle: string; authorName: string; authorEmail: string; blogId: string; description?: string; submittedAt?: string }
  | { type: "edit_submitted";   blogTitle: string; authorName: string; authorEmail: string; blogId: string; description?: string; submittedAt?: string }
  | { type: "delete_requested"; blogTitle: string; authorName: string; authorEmail: string; blogId: string; description?: string; submittedAt?: string }
  | { type: "delete_cancelled"; blogTitle: string; authorName: string; authorEmail: string; blogId: string; description?: string; submittedAt?: string };


function formatIST(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildBody(payload: BlogEmailPayload, accentColor: string): string {
  return `
    <div class="field">
      <span class="label">Author</span>
      <span class="value">${payload.authorName} &lt;${payload.authorEmail}&gt;</span>
    </div>
    <div class="field">
      <span class="label">Blog Title</span>
      <span class="value">${payload.blogTitle}</span>
    </div>
    ${payload.description ? `
    <div class="field">
      <span class="label">Description</span>
      <span class="value" style="font-style:italic;color:#6b7280;">${payload.description}</span>
    </div>` : ""}
    ${payload.submittedAt ? `
    <div class="field">
      <span class="label">Submitted At</span>
      <span class="value">${formatIST(payload.submittedAt)}</span>
    </div>` : ""}
  `;
}

function adminEmailBase(
  accentColor: string,
  icon: string,
  heading: string,
  body: string,
  blogId: string,
  buttonLabel: string,
  buttonColor: string,
) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #f3f4f6;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h2 {
          color: ${accentColor};
          margin-top: 0;
          border-bottom: 3px solid ${accentColor};
          padding-bottom: 10px;
        }
        .field {
          margin: 16px 0;
          padding: 14px;
          background-color: #f9fafb;
          border-radius: 8px;
          border-left: 4px solid ${accentColor};
        }
        .label {
          font-weight: 600;
          color: #374151;
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .value {
          color: #111827;
          font-size: 15px;
        }
        .footer {
          margin-top: 28px;
          padding-top: 18px;
          border-top: 1px solid #e5e7eb;
          color: #9ca3af;
          font-size: 13px;
        }
        .action-button {
          display: inline-block;
          background-color: ${buttonColor};
          color: white !important;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin-top: 18px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>${icon} ${heading}</h2>
        ${body}
        <a href="${APP_URL}/admin/blogs/${blogId}" class="action-button">
          ${buttonLabel} →
        </a>
        <div class="footer">
          <p>This is an automated notification from PALETTE Publisher.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendBlogEmail(payload: BlogEmailPayload) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    switch (payload.type) {

      case "blog_submitted":
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `📝 New Blog Pending Review: "${payload.blogTitle}"`,
          html: adminEmailBase(
            "#14b8a6", "📝", "New Blog Submission",
            buildBody(payload, "#14b8a6"),
            payload.blogId, "Review Blog", "#14b8a6"
          ),
        });
        break;

      case "edit_submitted":
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `✏️ Edit Request Pending Review: "${payload.blogTitle}"`,
          html: adminEmailBase(
            "#6366f1", "✏️", "Blog Edit Request",
            buildBody(payload, "#6366f1"),
            payload.blogId, "Review Edit", "#6366f1"
          ),
        });
        break;

      case "delete_requested":
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `🗑️ Delete Request: "${payload.blogTitle}"`,
          html: adminEmailBase(
            "#ef4444", "🗑️", "Blog Deletion Request",
            buildBody(payload, "#ef4444"),
            payload.blogId, "Review Deletion Request", "#ef4444"
          ),
        });
        break;

      case "delete_cancelled":
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `↩️ Delete Request Cancelled: "${payload.blogTitle}"`,
          html: adminEmailBase(
            "#f59e0b", "↩️", "Blog Deletion Request Cancelled",
            buildBody(payload, "#f59e0b"),
            payload.blogId, "View Blog", "#f59e0b"
          ),
        });
        break;


    }

    console.log(`[Email] Sent: ${payload.type} for "${payload.blogTitle}"`);
  } catch (err: any) {
    console.error("[Email] Failed to send:", err.message);
  }
}
