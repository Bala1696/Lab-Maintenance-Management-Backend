import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Send an invitation email with a registration link.
 * @param {string} toEmail - Recipient email
 * @param {string} token - Unique invitation token
 * @param {string} role - 'hod' or 'technician'
 * @param {string} inviterName - Name of the person who sent the invite
 */
export const sendInvitationEmail = async (toEmail, token, role, inviterName = 'System Administrator') => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const registrationLink = `${frontendUrl}/register/${token}`;
  const roleLabel = role === 'hod' ? 'Head of Department (HOD)' : 'Lab Technician';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding:32px 40px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700; letter-spacing:-0.5px;">
                Lab<span style="opacity:0.85;">Maintain</span>
              </h1>
              <p style="margin:8px 0 0; color:rgba(255,255,255,0.85); font-size:13px;">
                Lab Equipment Management Portal
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 8px; color:#0f172a; font-size:20px; font-weight:700;">
                You're Invited! 🎉
              </h2>
              <p style="margin:0 0 24px; color:#64748b; font-size:14px; line-height:1.6;">
                <strong>${inviterName}</strong> has invited you to join the LabMaintain platform as a <strong>${roleLabel}</strong>.
              </p>

              <!-- Role Badge -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#f0fdfa; border:1px solid #ccfbf1; border-radius:8px; padding:16px 20px;">
                    <p style="margin:0; color:#0d9488; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:1px;">
                      Your Role
                    </p>
                    <p style="margin:4px 0 0; color:#0f766e; font-size:18px; font-weight:700;">
                      ${roleLabel}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px; color:#475569; font-size:14px; line-height:1.6;">
                Click the button below to create your account. This link will expire in <strong>48 hours</strong>.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${registrationLink}" 
                       style="display:inline-block; background:linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color:#ffffff; text-decoration:none; padding:14px 36px; border-radius:8px; font-size:15px; font-weight:600; letter-spacing:0.3px; box-shadow:0 4px 12px rgba(13,148,136,0.3);">
                      Create My Account →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link Fallback -->
              <p style="margin:28px 0 0; color:#94a3b8; font-size:12px; line-height:1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${registrationLink}" style="color:#0d9488; word-break:break-all;">${registrationLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc; border-top:1px solid #e2e8f0; padding:20px 40px; text-align:center;">
              <p style="margin:0; color:#94a3b8; font-size:11px; line-height:1.5;">
                This invitation was sent by LabMaintain. If you didn't expect this email, you can safely ignore it.
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

  const transporter = createTransporter();

  const mailOptions = {
    from: `"LabMaintain" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `You're invited to join LabMaintain as ${roleLabel}`,
    html: htmlContent
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 Invitation email sent to ${toEmail} — MessageID: ${info.messageId}`);
  return info;
};
