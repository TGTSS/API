import nodemailer from "nodemailer";
import sgTransport from "nodemailer-sendgrid-transport";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport(
  sgTransport({
    auth: {
      api_key: process.env.EMAIL_API_KEY, // Pegamos a API Key do .env
    },
  })
);

export default transporter;
