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
    });
    return transporter;
};

// attachments: nodemailer format, e.g. [{ filename, content: Buffer, contentType }]
const sendEmail = async(to, subject, html, attachments) => {
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