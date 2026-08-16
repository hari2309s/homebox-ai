export const PASSWORD_MIN_LENGTH = 10;

export interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

// Kept in sync with the Supabase project's own "Password requirements"
// setting (Authentication → Sign In / Providers → Email: "Lowercase,
// uppercase letters, digits and symbols") — a password rejected server-side
// should never have been accepted by this check first.
export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  { id: "upper", label: "One uppercase letter", test: (password) => /[A-Z]/.test(password) },
  { id: "lower", label: "One lowercase letter", test: (password) => /[a-z]/.test(password) },
  { id: "number", label: "One number", test: (password) => /[0-9]/.test(password) },
  { id: "symbol", label: "One symbol (e.g. ! @ # $ %)", test: (password) => /[^A-Za-z0-9]/.test(password) },
];

export const PASSWORD_REQUIREMENTS_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include an uppercase letter, a lowercase letter, a number, and a symbol.`;

export function isPasswordValid(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((requirement) => requirement.test(password));
}
