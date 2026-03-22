import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "PALETTE Publisher <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "tamajitsaha05@gmail.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Returns hosted logo URL in production; empty string in local dev (falls back to text).
function getLogoUrl(): string {
  if (APP_URL && !APP_URL.includes("localhost")) {
    return `${APP_URL}/images/Logo.png`;
  }
  return "";
}

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
    <tr>
      <td style="padding: 6px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:14px 16px;">
              <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#94a3b8;">Author</p>
              <p style="margin:0;font-size:15px;color:#1e293b;font-weight:600;">${payload.authorName}</p>
              <p style="margin:2px 0 0 0;font-size:13px;color:#64748b;">${payload.authorEmail}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 6px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:14px 16px;">
              <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#94a3b8;">Blog Title</p>
              <p style="margin:0;font-size:16px;color:#1e293b;font-weight:700;">${payload.blogTitle}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${payload.description ? `
    <tr>
      <td style="padding: 6px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:14px 16px;">
              <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#94a3b8;">Description</p>
              <p style="margin:0;font-size:14px;color:#475569;font-style:italic;line-height:1.6;">${payload.description}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : ""}
    ${payload.submittedAt ? `
    <tr>
      <td style="padding: 6px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:14px 16px;">
              <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#94a3b8;">Submitted At</p>
              <p style="margin:0;font-size:14px;color:#1e293b;">${formatIST(payload.submittedAt)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : ""}
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
  badgeLabel: string,
  badgeBg: string,
) {
  const logoUrl = getLogoUrl();

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>${heading}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

      <!-- Outer wrapper -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:32px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

              <!-- Header / Brand bar -->
              <tr>
                <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-radius:16px 16px 0 0;padding:24px 32px;border-bottom:1px solid #334155;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td valign="middle">
                        ${logoUrl
                          ? `<img src="${logoUrl}" alt="PALETTE Publisher" width="140" style="display:block;height:auto;max-width:140px;" />`
                          : `<p style="margin:0;font-size:22px;font-weight:800;color:#14b8a6;letter-spacing:-0.5px;">🎨 PALETTE <span style="color:#f1f5f9;font-weight:400;">Publisher</span></p>`
                        }
                        <p style="margin:6px 0 0 0;font-size:11px;color:#64748b;letter-spacing:0.8px;text-transform:uppercase;">Admin Notification</p>
                      </td>
                      <td align="right" valign="middle">
                        <span style="display:inline-block;background:${badgeBg};color:#fff;font-size:11px;font-weight:700;padding:5px 12px;border-radius:100px;letter-spacing:0.5px;text-transform:uppercase;">${badgeLabel}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Icon + Heading strip -->
              <tr>
                <td style="background-color:#1e293b;padding:24px 32px 0 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td valign="middle">
                        <span style="font-size:32px;line-height:1;">${icon}</span>
                      </td>
                      <td valign="middle" style="padding-left:14px;">
                        <h1 style="margin:0;font-size:20px;font-weight:800;color:#f1f5f9;line-height:1.2;">${heading}</h1>
                        <p style="margin:4px 0 0 0;font-size:13px;color:#64748b;">Action required — review the details below.</p>
                      </td>
                    </tr>
                  </table>
                  <!-- Accent rule -->
                  <div style="height:3px;background:linear-gradient(90deg,${accentColor},transparent);border-radius:2px;margin-top:20px;"></div>
                </td>
              </tr>

              <!-- Body / Fields -->
              <tr>
                <td style="background-color:#1e293b;padding:20px 32px 28px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${body}
                  </table>
                </td>
              </tr>

              <!-- CTA Button row -->
              <tr>
                <td style="background-color:#1e293b;padding:0 32px 32px 32px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="border-radius:8px;background-color:${buttonColor};">
                        <a href="${APP_URL}/admin/blogs/${blogId}"
                           style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">
                          ${buttonLabel} &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color:#0f172a;border-radius:0 0 16px 16px;padding:20px 32px;border-top:1px solid #1e293b;">
                  <p style="margin:0;font-size:12px;color:#475569;line-height:1.7;">
                    This is an automated notification from <strong style="color:#64748b;">PALETTE Publisher</strong>.<br/>
                    Do not reply to this email directly.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>

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
            payload.blogId, "Review Blog", "#14b8a6",
            "New Submission", "#0d9488",
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
            payload.blogId, "Review Edit", "#6366f1",
            "Edit Pending", "#4f46e5",
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
            payload.blogId, "Review Deletion Request", "#ef4444",
            "Delete Request", "#dc2626",
          ),
        });
        break;

      case "delete_cancelled":
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `↩️ Delete Request Cancelled: "${payload.blogTitle}"`,
          html: adminEmailBase(
            "#f59e0b", "↩️", "Deletion Request Cancelled",
            buildBody(payload, "#f59e0b"),
            payload.blogId, "View Blog", "#f59e0b",
            "Cancelled", "#d97706",
          ),
        });
        break;

    }

    console.log(`[Email] Sent: ${payload.type} for "${payload.blogTitle}"`);
  } catch (err: any) {
    console.error("[Email] Failed to send:", err.message);
  }
}
