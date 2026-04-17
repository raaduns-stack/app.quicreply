import {
  type GetPasswordResetEmailContentFn,
  type GetVerificationEmailContentFn,
} from "wasp/server/auth";

const baseEmailStyle = `
  font-family: 'Inter', Helvetica, Arial, sans-serif;
  background-color: #f7f8fa;
  color: #191c1d;
  padding: 40px 20px;
  line-height: 1.6;
`;

const cardStyle = `
  max-width: 500px;
  margin: 0 auto;
  background-color: #ffffff;
  border-radius: 16px;
  padding: 40px 32px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
`;

const buttonStyle = `
  display: inline-block;
  background-color: #FE901D;
  color: #ffffff;
  text-decoration: none;
  font-weight: 700;
  padding: 14px 28px;
  border-radius: 10px;
  margin-top: 24px;
  margin-bottom: 24px;
`;

export const getVerificationEmailContent: GetVerificationEmailContentFn = ({
  verificationLink,
}) => ({
  subject: "Verify your email to start using QuicReply",
  text: `Welcome to QuicReply! Click the link below to verify your email and activate your account: ${verificationLink}`,
  html: `
    <div style="${baseEmailStyle}">
      <div style="${cardStyle}">
        <h2 style="margin-top: 0; color: #0d0d0d; font-size: 24px; font-weight: 800;">Welcome to QuicReply! 🚀</h2>
        <p style="font-size: 15px; color: #4b5563;">
          You're just one step away from scaling your sales on autopilot. Please verify your email address to unlock your dashboard and activate your 14-day free trial.
        </p>
        <div style="text-align: center;">
          <a href="${verificationLink}" style="${buttonStyle}">Verify My Email</a>
        </div>
        <p style="font-size: 13px; color: #6b7280; margin-bottom: 0;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${verificationLink}" style="color: #FE901D;">${verificationLink}</a>
        </p>
      </div>
    </div>
  `,
});

export const getPasswordResetEmailContent: GetPasswordResetEmailContentFn = ({
  passwordResetLink,
}) => ({
  subject: "Reset your QuicReply password",
  text: `We received a request to reset your password. Click here: ${passwordResetLink}`,
  html: `
    <div style="${baseEmailStyle}">
      <div style="${cardStyle}">
        <h2 style="margin-top: 0; color: #0d0d0d; font-size: 24px; font-weight: 800;">Reset your password</h2>
        <p style="font-size: 15px; color: #4b5563;">
          We received a request to reset the password for your QuicReply account. Click the button below to choose a new password.
        </p>
        <div style="text-align: center;">
          <a href="${passwordResetLink}" style="${buttonStyle}">Reset Password</a>
        </div>
        <p style="font-size: 13px; color: #6b7280; margin-bottom: 0;">
          If you didn't make this request, you can safely ignore this email.<br/><br/>
          Or copy this link:<br/>
          <a href="${passwordResetLink}" style="color: #FE901D;">${passwordResetLink}</a>
        </p>
      </div>
    </div>
  `,
});
