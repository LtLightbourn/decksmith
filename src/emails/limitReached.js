/**
 * Email sent when a free user hits their 10-build limit.
 * Returns { subject, html } — HTML uses inline styles for email-client compatibility.
 */
export function limitReachedEmail({ firstName, appUrl }) {
  return {
    subject: "You've used your 3 free Merlin builds ✦",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your free builds are used</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0805;font-family:Georgia,'Times New Roman',serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#0a0805;">
    <tr>
      <td align="center" style="padding:44px 16px 44px;">

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
                The Well Runs Dry,<br>${firstName}
              </h1>

              <!-- Divider -->
              <div style="height:1px;background-color:#2e2418;margin:0 0 22px;"></div>

              <!-- Body copy -->
              <p style="margin:0 0 14px;font-size:15px;color:#7a6a4a;line-height:1.75;">
                You've used all <strong style="color:#c9a060;">3 free Merlin builds</strong>
                on Decksmith. The forge has gone cold &mdash; for now.
              </p>
              <p style="margin:0 0 26px;font-size:15px;color:#7a6a4a;line-height:1.75;">
                Upgrade to Decksmith Arcane to keep building. Unlimited decks, unlimited
                refinements, and Merlin at your command whenever the urge strikes.
              </p>

              <!-- Feature list -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin:0 0 30px;">
                ${[
                  'Unlimited AI deck builds',
                  'Chat with Merlin to tune any deck',
                  'Advanced upgrade &amp; budget suggestions',
                  'Priority Merlin responses',
                  'Early access to new features',
                ].map(f => `
                <tr>
                  <td style="padding:5px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="22" style="vertical-align:top;padding-top:2px;
                                              font-family:Georgia,serif;font-size:11px;
                                              color:#c9a060;">&#10022;</td>
                        <td style="font-family:Georgia,'Times New Roman',serif;font-size:13px;
                                   color:#8a7a5a;line-height:1.6;">${f}</td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join('')}
              </table>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#4a3208;border:1px solid #8a6820;border-radius:2px;">
                    <a href="${appUrl}"
                       style="display:block;padding:13px 30px;font-family:Georgia,'Times New Roman',serif;
                              font-size:11px;letter-spacing:2px;text-transform:uppercase;
                              color:#f0d080;text-decoration:none;white-space:nowrap;">
                      Upgrade to Decksmith Arcane &mdash; $5/month
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 36px 20px;border-top:1px solid #221c10;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;
                        color:#2e2418;line-height:1.7;">
                Sent by Decksmith &mdash; the AI Commander deck builder.<br>
                You received this because you use Decksmith.
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
