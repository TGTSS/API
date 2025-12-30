import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["EMAIL_USER", "EMAIL_PASS", "EMAIL_FROM"];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(
    "❌ Missing required environment variables for email configuration:"
  );
  missingVars.forEach((varName) => console.error(`   - ${varName}`));
  console.error(
    "Please create a .env file with the required variables. See env.example for reference."
  );
  // process.exit(1); // Modificado para não derrubar o servidor se faltar config de email
} else {
  console.log("✅ Email configuration loaded successfully");
}

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Test the transporter configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error("❌ SMTP connection failed:", error);
  } else {
    console.log("✅ SMTP server is ready to send emails");
  }
});

export default transporter;
