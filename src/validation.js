const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normalizeOptions = (options) => {
  if (Array.isArray(options)) {
    return options.map((o) => (typeof o === 'object' ? { value: String(o.value), label: String(o.label ?? o.value) } : { value: String(o), label: String(o) }));
  }
  return Object.entries(options || {}).map(([value, label]) => ({ value: String(value), label: String(label) }));
};

export const validateField = (field, value) => {
  const text = (value ?? '').toString().trim();
  const rules = field.rules || {};
  const label = field.label;

  if (!text) return field.required || rules.required ? `${label} is required` : '';
  if ((rules.email || field.type === 'email') && !EMAIL.test(text)) return 'Enter a valid email address';
  if (rules.numeric && Number.isNaN(Number(text))) return `${label} must be a number`;

  const size = rules.numeric ? Number(text) : text.length;
  const unit = rules.numeric ? '' : ' characters';
  if (rules.min != null && size < rules.min) return `${label} must be at least ${rules.min}${unit}`;
  if (rules.max != null && size > rules.max) return `${label} must not be more than ${rules.max}${unit}`;

  if (rules.regex) {
    try {
      if (!new RegExp(rules.regex).test(text)) return `${label} format is invalid`;
    } catch (e) {
      return '';
    }
  }

  return '';
};

export const validatePassword = (value, min) => {
  if (!value) return 'Password is required';
  return value.length < min ? `Password must be at least ${min} characters` : '';
};

export const validateConfirm = (password, confirm) => {
  if (!confirm) return 'Please confirm your password';
  return confirm === password ? '' : 'Passwords do not match';
};

export const compact = (errors) => Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
