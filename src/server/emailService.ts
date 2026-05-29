import { logger } from "./logger";

interface EmailConfig {
  resendApiKey?: string;
  emailFrom: string;
}

export class EmailService {
  constructor(private readonly config: EmailConfig) {}

  async sendRegistrationOtp(email: string, displayName: string, otp: string): Promise<void> {
    await this.sendOtp(email, "Your Quattro registration code", [
      `Hi ${displayName},`,
      "",
      "Use this one-time code to finish creating your Quattro account:",
      otp,
      "",
      "This code expires in 10 minutes.",
    ], "registration otp", otp);
  }

  async sendPasswordResetOtp(email: string, displayName: string, otp: string): Promise<void> {
    await this.sendOtp(email, "Reset your Quattro password", [
      `Hi ${displayName},`,
      "",
      "Use this one-time code to reset your Quattro password:",
      otp,
      "",
      "This code expires in 10 minutes.",
    ], "password reset otp", otp);
  }

  private async sendOtp(email: string, subject: string, lines: string[], logMessage: string, otp: string): Promise<void> {
    if (!this.config.resendApiKey) {
      logger.info({ email, otp }, logMessage);
      return;
    }

    const text = lines.join("\n");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.resendApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: this.config.emailFrom,
        to: email,
        subject,
        text,
      }),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      throw new Error(`OTP email failed: ${response.status} ${responseText}`);
    }
  }
}
