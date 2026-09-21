type ScriptureProps = { children?: string };

export function Scripture({ children }: ScriptureProps) {
  return children ? <blockquote className="curriculum-scripture">{children}</blockquote> : null;
}
