/**
 * Re-engagement email sent 3 days after signup if the user hasn't built a deck.
 * Returns { subject, html }
 */
export function reengagementEmail({ firstName, appUrl }) {
  return {
    subject: `Your forge is cold, ${firstName} — Merlin is waiting`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Merlin is waiting</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0805;font-family:Georgia,'Times New Roman',serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#0a0805;">
    <tr>
      <td align="center" style="padding:44px 16px;">

        <!-- Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:560px;width:100%;background-color:#1c160f;border:1px solid #3e3018;">

          <!-- Logo row -->
          <tr>
            <td style="padding:24px 36px 22px;border-bottom:1px solid #2a2010;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:10px;
                        letter-spacing:4px;text-transform:uppercase;color:#6a5020;">
                &#9876;&nbsp; DECKSMITH
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:38px 36px 32px;">

              <!-- Heading -->
              <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;
                         font-size:24px;font-weight:bold;color:#c9a060;line-height:1.25;
                         letter-spacing:0.5px;">
                The Forge Awaits,<br>${firstName}
              </h1>

              <!-- Divider -->
              <div style="height:1px;background-color:#2e2418;margin:0 0 22px;"></div>

              <!-- Body copy -->
              <p style="margin:0 0 20px;font-size:15px;color:#7a6a4a;line-height:1.75;">
                You signed up for Decksmith a few days ago but haven't built your first deck yet.
                Merlin's been waiting by the forge.
              </p>

              <!-- Prompt ideas -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin:0 0 28px;background-color:#141008;border:1px solid #2a2010;border-radius:2px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:10px;
                               letter-spacing:2px;text-transform:uppercase;color:#6a5020;">
                      Try one of these to start
                    </p>
                    ${[
                      '"A Simic ramp deck for a casual pod, bracket 2, budget under $80"',
                      '"Political Mardu deck that plays threat assessment, no combos"',
                      '"Surprise me — I want something I\'ve never played before"',
                    ].map(prompt => `
                    <p style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:13px;
                               font-style:italic;color:#6a5a3a;line-height:1.6;padding-left:12px;
                               border-left:2px solid #3a2e10;">
                      ${prompt}
                    </p>`).join('')}
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#4a3208;border:1px solid #8a6820;border-radius:2px;">
                    <a href="${appUrl}"
                       style="display:block;padding:13px 30px;font-family:Georgia,'Times New Roman',serif;
                              font-size:11px;letter-spacing:2px;text-transform:uppercase;
                              color:#f0d080;text-decoration:none;white-space:nowrap;">
                      Build Your First Deck &#8594;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0;font-size:12px;color:#3a3020;font-style:italic;line-height:1.6;">
                You have 3 free builds — no credit card needed to start.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 36px 20px;border-top:1px solid #221c10;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;
                        color:#2e2418;line-height:1.7;">
                Sent by Decksmith &mdash; the AI Commander deck builder.<br>
                <a href="${appUrl}" style="color:#3a2e18;text-decoration:underline;">Visit Decksmith</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`,
  }
}
