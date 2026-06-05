const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Allows letters, spaces, hyphens, apostrophes, and dots (covers most name formats)
const NAME_RE = /^[a-zA-Z\s'\-.]+$/;

// ─── Field validators ────────────────────────────────────────────────────────
// Each returns an error string or null (no error).

export function validateEmail(email: string): string | null {
  const v = email.trim();
  if (!v) return 'Email is required';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address';
  return null;
}

/** Login only — don't enforce strength so older passwords still work. */
export function validateLoginPassword(password: string): string | null {
  if (!password) return 'Password is required';
  return null;
}

/** Registration — min 6 chars, must include at least one letter and one number. */
export function validatePassword(password: string, minLength = 6): string | null {
  if (!password) return 'Password is required';
  if (password.length < minLength) return `Password must be at least ${minLength} characters`;
  if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
}

export function validateName(name: string): string | null {
  const v = name.trim();
  if (!v) return 'Full name is required';
  if (v.length < 2) return 'Name must be at least 2 characters';
  if (v.length > 50) return 'Name must be 50 characters or fewer';
  if (!NAME_RE.test(v)) return 'Name may only contain letters, spaces, hyphens, and apostrophes';
  return null;
}

export function validatePhone(phone: string): string | null {
  if (!phone.trim()) return 'Phone number is required';
  if (!/^\d{10}$/.test(phone.trim())) return 'Enter a valid 10-digit mobile number';
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
