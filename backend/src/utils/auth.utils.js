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

const sendEmail = async(to, subject,html) => {
    const transporter = nodemailer.createTransport({
        host:process.env.SMTP_HOST,
        port:process.env.SMTP_PORT,
        secure:true,
        service:"gmail",
        auth:{
            user:process.env.SMTP_USER,
            pass:process.env.SMTP_PASS
        },
    });

    const mailOptions = {
        from:process.env.EMAIL_USER,
        to,
        subject,
        html,
    };

    await transporter.sendMail(mailOptions);
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