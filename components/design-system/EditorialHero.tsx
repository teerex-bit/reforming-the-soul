import { ReactNode, useId } from 'react';

type EditorialHeroProps = { eyebrow?: string; title: string; children?: ReactNode };

export function EditorialHero({ eyebrow, title, children }: EditorialHeroProps) {
  const headingId = useId();
  return (
    <section className="editorial-hero" aria-labelledby={headingId}>
      <div className="editorial-hero__inner">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 id={headingId}>{title}</h1>
        {children ? <div className="editorial-hero__body">{children}</div> : null}
      </div>
    </section>
  );
}
