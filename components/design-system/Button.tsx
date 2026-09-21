import { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' };

export function Button({ className, variant = 'primary', style, type = 'button', ...props }: ButtonProps) {
  const classes = ['button', variant === 'secondary' ? 'button--secondary' : null, className].filter(Boolean).join(' ');
  const { minHeight: _ignoredMinHeight, ...callerStyle } = style ?? {};
  return <button {...props} className={classes} style={{ ...callerStyle, minHeight: '44px' }} type={type} />;
}
