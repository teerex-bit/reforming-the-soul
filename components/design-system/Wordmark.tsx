type WordmarkProps = { href?: string };

export function Wordmark({ href }: WordmarkProps) {
  const image = <img src="/assets/logos/rts-tree-wordmark.png" alt="Reforming the Soul" />;
  return href ? <a className="wordmark" href={href}>{image}</a> : <span className="wordmark">{image}</span>;
}
