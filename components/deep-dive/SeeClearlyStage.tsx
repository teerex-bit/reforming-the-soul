import Link from 'next/link';

const selfLessons = [
  'Facts and Interpretation',
  'Follow the Formation Chain',
  'The Learned Self-Story',
  'What Is Actually True About Me',
] as const;
const godLessons = [
  'The God I Learned',
  'What I Expect From God',
  'Jesus Shows Us the Father',
  'Can I Trust God Here?',
] as const;

export function SeeClearlyStage({ status, sy2Status }: { status: 'begin' | 'resume' | 'review'; sy2Status?: 'begin' | 'resume' | 'review' }) {
  const href = `/deep-dive/see-clearly/facts-and-interpretation${status === 'review' ? '?section=entry' : ''}`;
  return <section className="deep-dive-home deep-dive-home--see-clearly">
    <p className="eyebrow">THE FORMATION JOURNEY · SEE CLEARLY</p>
    <h1>See Clearly</h1>
    <p className="deep-dive-introduction">We often respond to the meaning we give a moment before we have had time to examine it. See Clearly makes room to look at the lens through which you understand yourself and then the picture of God you actually expect and live from.</p>
    <div className="see-clearly-movements">
      <section className="see-clearly-movement" aria-labelledby="see-yourself-heading">
        <p className="eyebrow">PART I</p>
        <h2 id="see-yourself-heading">See Yourself Clearly</h2>
        <p>First examine the lens through which you understand yourself and your experiences.</p>
        <ol className="see-clearly-movement__lessons" aria-label="See Yourself Clearly modules">
          {selfLessons.map((title, index) => <li key={title} id={`see-yourself-${index === 0 ? 'sc1' : `sy${index + 1}`}`}>
            <span className="see-clearly-movement__number">SY{index + 1}</span>
            <span>{title}</span>
            {index === 2 && sy2Status === 'review' ? <span className="see-clearly-movement__next">Up next</span> : null}
            {index === 1 && status === 'review' ? <Link className="button button--secondary" href={`/deep-dive/see-clearly/follow-the-formation-chain${sy2Status === 'review' ? '?section=entry' : ''}`}>{sy2Status === 'review' ? 'Review' : sy2Status === 'resume' ? 'Resume' : 'Begin'} SY2</Link> : null}
            {index === 0 ? <Link className="button button--secondary" href={href}>{status === 'review' ? 'Review' : status === 'resume' ? 'Resume' : 'Begin'} SY1</Link> : null}
          </li>)}
        </ol>
      </section>
      <section className="see-clearly-movement" aria-labelledby="see-god-heading">
        <p className="eyebrow">PART II</p>
        <h2 id="see-god-heading">See God Clearly</h2>
        <p>Then examine the picture of God you actually expect and live from.</p>
        <ol className="see-clearly-movement__lessons" aria-label="See God Clearly modules">
          {godLessons.map((title, index) => <li key={title} id={`see-god-sg${index + 1}`}><span className="see-clearly-movement__number">SG{index + 1}</span><span>{title}</span></li>)}
        </ol>
      </section>
    </div>
  </section>;
}
