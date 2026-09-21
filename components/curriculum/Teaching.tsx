type TeachingProps = { title: string; children: string };

export function Teaching({ title, children }: TeachingProps) {
  return <section className="reflection-panel"><h1>{title}</h1><p>{children}</p></section>;
}
