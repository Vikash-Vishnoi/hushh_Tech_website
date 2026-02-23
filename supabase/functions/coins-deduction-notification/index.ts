import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** NDA-style black & white email for Hushh Coins deduction (meeting booked) */
const buildDeductionEmailHtml = (name: string, coins: number, meetingDate: string, meetingTime: string, date: string) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:0;">

        <!-- Black Header -->
        <tr><td style="background-color:#000000;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">HUSHH</h1>
          <p style="margin:6px 0 0;color:#999999;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Meeting Booking Confirmation</p>
        </td></tr>

        <!-- Success Hero -->
        <tr><td style="padding:40px 40px 24px;text-align:center;">
          <p style="margin:0;font-size:48px;line-height:1;">✅</p>
          <h2 style="margin:12px 0 8px;color:#000000;font-size:24px;font-weight:800;">Meeting Confirmed!</h2>
          <p style="margin:0;color:#666666;font-size:14px;">Your consultation has been successfully scheduled</p>
        </td></tr>

        <!-- Meeting Details -->
        <tr><td style="padding:0 40px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #000000;">
            <tr style="background-color:#000000;">
              <td style="padding:10px 16px;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;" colspan="2">Meeting Details</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:12px 16px;font-size:13px;color:#666666;width:40%;">With</td>
              <td style="padding:12px 16px;font-size:13px;color:#000000;font-weight:600;">Manish Sainani, Hedge Fund Manager</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:12px 16px;font-size:13px;color:#666666;">Date</td>
              <td style="padding:12px 16px;font-size:13px;color:#000000;font-weight:600;">${meetingDate}</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:12px 16px;font-size:13px;color:#666666;">Time</td>
              <td style="padding:12px 16px;font-size:13px;color:#000000;font-weight:600;">${meetingTime}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#666666;">Duration</td>
              <td style="padding:12px 16px;font-size:13px;color:#000000;font-weight:600;">1 Hour</td>
            </tr>
          </table>
        </td></tr>

        <!-- Coins Transaction -->
        <tr><td style="padding:0 40px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #000000;">
            <tr style="background-color:#000000;">
              <td style="padding:10px 16px;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;" colspan="2">Coins Transaction</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:12px 16px;font-size:13px;color:#666666;width:40%;">Coins Used</td>
              <td style="padding:12px 16px;font-size:13px;color:#000000;font-weight:600;">${coins.toLocaleString()} HC</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:12px 16px;font-size:13px;color:#666666;">Value</td>
              <td style="padding:12px 16px;font-size:13px;color:#000000;font-weight:600;">$${(coins / 100).toLocaleString()}</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e5e5;">
              <td style="padding:12px 16px;font-size:13px;color:#666666;">Purpose</td>
              <td style="padding:12px 16px;font-size:13px;color:#000000;font-weight:600;">CEO Consultation Booking</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#666666;">Transaction Date</td>
              <td style="padding:12px 16px;font-size:13px;color:#000000;font-weight:600;">${date}</td>
            </tr>
          </table>
        </td></tr>

        <!-- What to prepare -->
        <tr><td style="padding:0 40px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #000000;">
            <tr style="background-color:#000000;">
              <td style="padding:10px 16px;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Prepare For Your Session</td>
            </tr>
            <tr>
              <td style="padding:16px;">
                <p style="margin:0 0 10px;font-size:13px;color:#333333;">📋 <strong>Review your portfolio</strong> — Have your current investment holdings and goals ready to discuss.</p>
                <p style="margin:0 0 10px;font-size:13px;color:#333333;">❓ <strong>Prepare questions</strong> — Write down specific questions about strategies, allocation, or market outlook.</p>
                <p style="margin:0;font-size:13px;color:#333333;">📧 <strong>Check your calendar invite</strong> — A separate calendar invite with the meeting link will be sent shortly.</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid #e5e5e5;text-align:center;">
          <p style="margin:0 0 4px;font-size:11px;color:#999999;">This email was sent by Hushh Technologies Pte Ltd.</p>
          <p style="margin:0;font-size:11px;color:#999999;">© ${new Date().getFullYear()} Hushh. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { recipientEmail, recipientName, coinsDeducted, meetingDate, meetingTime } = await req.json();
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "Missing recipientEmail" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const name = recipientName || "Hushh User";
    const coins = Number(coinsDeducted) || 300000;
    const mDate = meetingDate || "TBD";
    const mTime = meetingTime || "TBD";
    const date = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
    const gmailUser = Deno.env.get("GMAIL_USER") || "ankit@hushh.ai";
    const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD") || "";

    const client = new SMTPClient({
      connection: { hostname: "smtp.gmail.com", port: 587, tls: true, auth: { username: gmailUser, password: gmailPass } },
    });

    await client.send({
      from: `"Hushh Technologies" <${gmailUser}>`,
      to: recipientEmail,
      subject: `✅ Meeting Confirmed — ${coins.toLocaleString()} Hushh Coins Used`,
      html: buildDeductionEmailHtml(name, coins, mDate, mTime, date),
    });

    await client.close();
    console.log(`✅ Deduction email sent to ${recipientEmail}: ${coins} coins for meeting on ${mDate}`);

    return new Response(JSON.stringify({ success: true, message: "Deduction email sent" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("❌ Deduction email error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to send email" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
