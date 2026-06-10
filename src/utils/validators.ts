export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const isStrongPassword = (pwd: string): boolean => pwd.length >= 6;

export const validatePassword = (pwd: string): string | null => {
  if (!pwd) return 'Password is required';
  if (pwd.length < 6) return 'Password must be at least 6 characters';
  return null;
};

export const validateEmail = (email: string): string | null => {
  if (!email) return 'Email is required';
  if (!isValidEmail(email)) return 'Please enter a valid email';
  return null;
};

export const validateName = (name: string): string | null => {
  if (!name.trim()) return 'Name is required';
  if (name.trim().length < 2) return 'Name is too short';
  return null;
};
