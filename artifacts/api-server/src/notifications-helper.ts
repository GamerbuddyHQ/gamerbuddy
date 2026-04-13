import { db, notificationsTable } from "@workspace/db";

export type NotificationType =
  | "new_bid"
  | "bid_accepted"
  | "session_started"
  | "payment_released"
  | "review_received"
  | "session_complete"
  | "reward_earned";

export async function createNotification(params: {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    await db.insert(notificationsTable).values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link ?? null,
    });
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}

export async function sendEmailNotification(params: {
  to: string;
  subject: string;
  body: string;
}) {
  // Email sending is opt-in — configure RESEND_API_KEY env var to enable
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Gamerbuddy <notifications@gamerbuddy.app>",
        to: params.to,
        subject: params.subject,
        text: params.body,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn("Email send failed:", text);
    }
  } catch (err) {
    console.error("Email error:", err);
  }
}
