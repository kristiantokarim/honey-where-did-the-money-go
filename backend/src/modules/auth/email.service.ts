import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null;
  private fromEmail: string;
  private frontendUrl: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('resend.apiKey');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.fromEmail = this.configService.get<string>('resend.fromEmail', 'noreply@example.com');
    this.frontendUrl = this.configService.get<string>('app.frontendUrl', 'http://localhost:5173');
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/verify-email?token=${token}`;
    await this.sendEmail(
      to,
      'Verify your email',
      `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
    );
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/reset-password?token=${token}`;
    await this.sendEmail(
      to,
      'Reset your password',
      `<p>Click <a href="${url}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    );
  }

  async sendHouseholdInviteEmail(
    to: string,
    inviterName: string,
    householdName: string,
    token: string,
  ): Promise<void> {
    const url = `${this.frontendUrl}/accept-invitation?token=${token}`;
    await this.sendEmail(
      to,
      `You're invited to ${householdName}`,
      `<p>${inviterName} invited you to join "${householdName}". Click <a href="${url}">here</a> to accept.</p>`,
    );
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`Email not sent (no API key configured): ${subject} to ${to}`);
      return;
    }
    try {
      await this.resend.emails.send({ from: this.fromEmail, to, subject, html });
      this.logger.log(`Email sent: ${subject} to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
    }
  }
}
