import nodemailer from "nodemailer";
import { config } from "../config";
import { logger } from "../utils/logger";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.gmailUser,
    pass: config.gmailAppPassword,
  },
});

export async function enviarMail(destinatario: string, asunto: string, cuerpo: string): Promise<void> {
  await transporter.sendMail({
    from: config.gmailUser,
    to: destinatario,
    subject: asunto,
    text: cuerpo,
  });
  logger.info("mail enviado a", destinatario);
}
