const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const sendVerificationEmail = (to, verifyUrl) => 
  sendEmail(
    to,
    "Verify your email",
    `
      <p>Click below to verify your account:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link expires in 24 hours.</p>
    `,
  );


const generateToken = async (user) => {
    const jti = crypto.randomUUID();
    const accessToken = jwt.sign(
        {
            sub:user.id,
            role:user.role,
            // comp = organization?.id,
            jti
        },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn:"15m"
        }
    );
    const refreshToken = jwt.sign(
        {
            sub:user.id,
            role:user.role,
            // comp = organization?.id,
            jti
        },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn:"30d"
        }
    )
    return { accessToken, refreshToken, jti }
}

const hashPassword = async (password) => {
    return bcrypt.hash(password,10);
};

// Configured entirely from SMTP_* so any provider works (Gmail on 465, Mailtrap on 2525, ...).
// Port 465 is implicit TLS; other ports upgrade with STARTTLS.
let transporter;
const getTransporter = () => {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter ??= nodemailer.createTransport({
        host:process.env.SMTP_HOST,
        port,
        secure:port === 465,
        auth:{
            user:process.env.SMTP_USER,
            pass:process.env.SMTP_PASS
        },
        // Fail in seconds, not nodemailer's default 2 minutes, when SMTP is unreachable.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
    });
    return transporter;
};

// Brevo's HTTPS API, for hosts that block outgoing SMTP ports (Render's free plan
// does). EMAIL_USER must be a sender verified in Brevo.
const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const sendWithBrevo = async (to, subject, html, attachments) => {
    const response = await fetch(BREVO_URL, {
        method: "POST",
        headers: {
            "api-key": process.env.BREVO_API_KEY,
            "content-type": "application/json",
            accept: "application/json",
        },
        body: JSON.stringify({
            sender: { email: process.env.EMAIL_USER },
            to: [{ email: to }],
            subject,
            htmlContent: html,
            ...(attachments && {
                attachment: attachments.map((a) => ({
                    name: a.filename,
                    content: Buffer.from(a.content).toString("base64"),
                })),
            }),
        }),
        signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
        throw new Error(`Brevo rejected the email (${response.status}): ${await response.text()}`);
    }
};

// attachments: nodemailer format, e.g. [{ filename, content: Buffer, contentType }]
// BREVO_API_KEY set -> Brevo's API; otherwise SMTP (local dev, Mailtrap, ...).
const sendEmail = async(to, subject, html, attachments) => {
    if (process.env.BREVO_API_KEY) {
        return sendWithBrevo(to, subject, html, attachments);
    }

    const mailOptions = {
        from:process.env.EMAIL_USER,
        to,
        subject,
        html,
        ...(attachments && { attachments }),
    };

    await getTransporter().sendMail(mailOptions);
}

const generateVerificationToken = () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    return { rawToken, hashedToken };
}


module.exports = {
    hashPassword,
    generateToken,
    sendEmail,
    generateVerificationToken,
    sendVerificationEmail
};