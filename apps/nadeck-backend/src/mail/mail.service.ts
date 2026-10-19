/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Transactional mail through Resend's HTTP API. Without RESEND_API_KEY nothing is sent and the
// message is logged instead, so local dev still shows the verification code in the console.
@Injectable()
export class MailService {
  async send(message: MailMessage): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn(`RESEND_API_KEY is not set - not sending "${message.subject}" to ${message.to}:\n${message.text}`);
      return false;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || 'Nadeck <no-reply@nadeck.net>',
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend answered ${res.status}: ${await res.text()}`);
    }
    return true;
  }
}
