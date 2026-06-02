/**
 * PII masking for client-side log statements.
 * Mirror of backend LogMaskUtil — keep rules in sync.
 * Never log raw email, phone, password, OTP, or token.
 */

export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  if (local.length <= 1) return `*@${domain}`;
  return `${local[0]}***@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone.length < 6) return '***';
  const prefix = phone.slice(0, 3);
  const suffix = phone.slice(-4);
  const dots = '•'.repeat(Math.max(0, phone.length - 7));
  return `${prefix}${dots}${suffix}`;
}

export function maskToken(_token: string | null | undefined): string {
  return '[REDACTED]';
}
