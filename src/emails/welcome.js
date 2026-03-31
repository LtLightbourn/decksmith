/**
 * Email sent on a user's first interaction with the API (usageCount === 0).
 * Returns { subject, html }
 */
export function welcomeEmail({ firstName, appUrl }) {
  return {
    subject: 'Welcome to Decksmith — your first deck awaits',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Decksmith</title>
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
                Welcome,<br>${firstName}
              </h1>

              <!-- Divider -->
              <div style="height:1px;background-color:#2e2418;margin:0 0 22px;"></div>

              <!-- Intro -->
              <p style="margin:0 0 26px;font-size:15px;color:#7a6a4a;line-height:1.75;">
                Decksmith is ready. You have
                <strong style="color:#c9a060;">10 free AI deck builds</strong>
                &mdash; enough to find your commander and your playstyle.
                Here's how to make the most of them:
              </p>

              <!-- 3-step guide -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin:0 0 30px;">

                ${[
                  {
                    n: '1',
                    title: 'Set your playstyle',
                    desc: 'Click the ♟ button in the top bar. Answer five quick questions about how you like to play. Merlin uses this for every deck it builds for you.',
                  },
                  {
                    n: '2',
                    title: 'Ask Merlin for a deck',
                    desc: 'Click "Ask Merlin" and describe what you want. Try: <em style="color:#6a5a38;">"A Simic ramp deck for a casual pod, no infinite combos, budget under $100."</em> Merlin returns a complete 100-card list.',
                  },
                  {
                    n: '3',
                    title: 'Refine, proxy, and play',
                    desc: 'Use the chat to swap cards, print a proxy sheet, or test opening hands in the playtester. Your deck synced automatically.',
                  },
                ].map(step => `
                <tr>
                  <td style="padding:0 0 18px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                           width="100%">
                      <tr>
                        <td width="36" style="vertical-align:top;padding-top:1px;">
                          <p style="margin:0;width:26px;height:26px;background-color:#1e1608;
                                    border:1px solid #4a3a18;border-radius:50%;
                                    font-family:Georgia,serif;font-size:13px;font-weight:bold;
                                    color:#c9a060;text-align:center;line-height:24px;">
                            ${step.n}
                          </p>
                        </td>
                        <td>
                          <p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;
                                    font-size:12px;letter-spacing:1.5px;text-transform:uppercase;
                                    color:#c9a060;">${step.title}</p>
                          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;
                                    font-size:13px;color:#6a5a3a;line-height:1.65;">${step.desc}</p>
                        </td>
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
                      Build Your First Deck &#8594;
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
