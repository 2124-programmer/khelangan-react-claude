const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Field validators ────────────────────────────────────────────────────────
// Each returns an error string or null (no error).

export function validateEmail(email: string): string | null {
  const v = email.trim();
  if (!v) return 'Email is required';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address';
  return null;
}

/** Login only — don't enforce length so older passwords still work. */
export function validateLoginPassword(password: string): string | null {
  if (!password) return 'Password is required';
  return null;
}

/** Registration — enforces minimum length. */
export function validatePassword(password: string, minLength = 6): string | null {
  if (!password) return 'Password is required';
  if (password.length < minLength) return `Password must be at least ${minLength} characters`;
  return null;
}

export function validateName(name: string): string | null {
  const v = name.trim();
  if (!v) return 'Full name is required';
  if (v.length < 2) return 'Name must be at least 2 characters';
  if (v.length > 50) return 'Name must be 50 characters or fewer';
  return null;
}

export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!phone.trim()) return 'Phone number is required';
  if (digits.length < 10) return 'Enter a valid 10-digit phone number';
  return null;
}

// ─── Batch helper ────────────────────────────────────────────────────────────

export function collectErrors(
  checks: Array<[string, () => string | null]>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [field, validate] of checks) {
    const msg = validate();
    if (msg) errors[field] = msg;
  }
  return errors;
}
