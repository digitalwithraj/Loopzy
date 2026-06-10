export const PASSWORD_RULES = {
  minLength: 8,
  patterns: {
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    number: /[0-9]/,
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
  },
} as const;

const ERROR_MESSAGE =
  'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.';

export function validatePassword(password: string): { isValid: boolean; error: string | null } {
  if (!password || password.length < PASSWORD_RULES.minLength) {
    return { isValid: false, error: ERROR_MESSAGE };
  }
  if (!PASSWORD_RULES.patterns.uppercase.test(password)) {
    return { isValid: false, error: ERROR_MESSAGE };
  }
  if (!PASSWORD_RULES.patterns.lowercase.test(password)) {
    return { isValid: false, error: ERROR_MESSAGE };
  }
  if (!PASSWORD_RULES.patterns.number.test(password)) {
    return { isValid: false, error: ERROR_MESSAGE };
  }
  if (!PASSWORD_RULES.patterns.special.test(password)) {
    return { isValid: false, error: ERROR_MESSAGE };
  }
  return { isValid: true, error: null };
}

export function isPasswordValid(password: string): boolean {
  return validatePassword(password).isValid;
}
