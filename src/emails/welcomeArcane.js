/**
 * Email sent when a user's Arcane subscription activates.
 * Returns { subject, html }
 */
export function welcomeArcaneEmail({ firstName, appUrl }) {
  return {
    subject: 'Welcome to Decksmith Arcane ✦ Unlimited builds unlocked',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Decksmith Arcane</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0805;font-family:Georgia,'Times New Roman',serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#0a0805;">
    <tr>
      <td align="center" style="padding:44px 16px;">

        <!-- Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:560px;width:100%;background-color:#1c160f;border:1px solid #5a4218;">

          <!-- Logo row -->
          <tr>
            <td style="padding:24px 36px 22px;border-bottom:1px solid #2e2010;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:10px;
                        letter-spacing:4px;text-transform:uppercase;color:#6a5020;">
                &#9876;&nbsp; DECKSMITH
              </p>
            </td>
          </tr>

          <!-- Gold accent strip -->
          <tr>
            <td style="height:3px;background-color:#6a4e10;"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:38px 36px 32px;">

              <!-- Arcane badge -->
              <p style="margin:0 0 18px;display:inline-block;padding:3px 12px;
                        background-color:#3a2a08;border:1px solid #7a5a18;border-radius:2px;
                        font-family:Georgia,'Times New Roman',serif;font-size:10px;
                        letter-spacing:3px;text-transform:uppercase;color:#d0a040;">
                &#10022; ARCANE MEMBER
              </p>

              <!-- Heading -->
              <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;
                         font-size:24px;font-weight:bold;color:#f0d080;line-height:1.25;
                         letter-spacing:0.5px;">
                The Arcane Guild Welcomes You,<br>${firstName}
              </h1>

              <!-- Divider -->
              <div style="height:1px;background-color:#3e2e14;margin:0 0 22px;"></div>

              <!-- Body copy -->
              <p style="margin:0 0 14px;font-size:15px;color:#7a6a4a;line-height:1.75;">
                Your Arcane subscription is now active. Merlin is at your command
                &mdash; <strong style="color:#c9a060;">unlimited</strong> deck builds,
                no caps, no waiting.
              </p>
              <p style="margin:0 0 26px;font-size:15px;color:#7a6a4a;line-height:1.75;">
                Here's what's now unlocked:
              </p>

              <!-- Feature list -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin:0 0 30px;">
                ${[
                  'Unlimited deck builds &mdash; build as many as you want',
                  'Chat with Merlin to refine any deck in your collection',
                  'Playgroup-aware tuning and pod threat analysis',
                  'Proxy sheet PDF generator and goldfish playtester',
                  'Commander finder, Surprise Me, and full analytics',
                ].map(f => `
                <tr>
                  <td style="padding:5px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="22" style="vertical-align:top;padding-top:2px;
                                              font-family:Georgia,serif;font-size:11px;
                                              color:#f0d080;">&#10022;</td>
                        <td style="font-family:Georgia,'Times New Roman',serif;font-size:13px;
                                   color:#8a7a5a;line-height:1.6;">${f}</td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join('')}
              </table>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                     style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#4a3208;border:1px solid #8a6820;border-radius:2px;">
                    <a href="${appUrl}"
                       style="display:block;padding:13px 30px;font-family:Georgia,'Times New Roman',serif;
                              font-size:11px;letter-spacing:2px;text-transform:uppercase;
                              color:#f0d080;text-decoration:none;white-space:nowrap;">
                      Start Building &#8594;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Tip -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:16px 18px;background-color:#141008;border:1px solid #2a2010;
                             border-radius:2px;">
                    <p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;
                               font-size:10px;letter-spacing:2px;text-transform:uppercase;
                               color:#6a5020;">Merlin's Tip</p>
                    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:13px;
                               font-style:italic;color:#6a5a3a;line-height:1.65;">
                      Try asking Merlin to tune your deck for your pod. Tell it the commanders
                      you play against &mdash; it'll suggest targeted swaps to handle your
                      specific threats.
                    </p>
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
                Sent by Decksmith &mdash; the Commander deck builder.<br>
                To manage your subscription, visit your account at
                <a href="${appUrl}" style="color:#3a2e18;text-decoration:underline;">Decksmith</a>.
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
