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

export function SeeClearlyStage({ status, sy2Status, sy3Status, sy4Status, sg1Status, sg2Status, sg3Status }: { status: 'begin' | 'resume' | 'review'; sy2Status?: 'begin' | 'resume' | 'review'; sy3Status?: 'begin' | 'resume' | 'review'; sy4Status?: 'begin' | 'resume' | 'review'; sg1Status?: 'begin' | 'resume' | 'review'; sg2Status?: 'begin' | 'resume' | 'review'; sg3Status?: 'begin' | 'resume' | 'review' }) {
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
            {index === 3 && sy3Status === 'review' ? <Link className="button button--secondary" href={`/deep-dive/see-clearly/what-is-actually-true-about-me${sy4Status === 'review' ? '?section=entry' : ''}`}>{sy4Status === 'review' ? 'Review' : sy4Status === 'resume' ? 'Resume' : 'Begin'} SY4</Link> : null}
            {index === 2 && sy2Status === 'review' ? <Link className="button button--secondary" href={`/deep-dive/see-clearly/the-learned-self-story${sy3Status === 'review' ? '?section=entry' : ''}`}>{sy3Status === 'review' ? 'Review' : sy3Status === 'resume' ? 'Resume' : 'Begin'} SY3</Link> : null}
            {index === 1 && status === 'review' ? <Link className="button button--secondary" href={`/deep-dive/see-clearly/follow-the-formation-chain${sy2Status === 'review' ? '?section=entry' : ''}`}>{sy2Status === 'review' ? 'Review' : sy2Status === 'resume' ? 'Resume' : 'Begin'} SY2</Link> : null}
            {index === 0 ? <Link className="button button--secondary" href={href}>{status === 'review' ? 'Review' : status === 'resume' ? 'Resume' : 'Begin'} SY1</Link> : null}
          </li>)}
        </ol>
      </section>
      <section className="see-clearly-movement" aria-labelledby="see-god-heading">
        <p className="eyebrow">PART II</p>
        <h2 id="see-god-heading">See God Clearly</h2>
        {sy4Status === 'review' && sg2Status !== 'review' ? <p className="see-clearly-movement__next">Up next: {sg1Status === 'review' ? 'SG2 — What I Expect From God' : 'SG1 — The God I Learned'}</p> : null}
        {sg2Status === 'review' ? <p className="see-clearly-movement__next">Up next: {sg3Status === 'review' ? 'SG4 — Can I Trust God Here?' : 'SG3 — Jesus Shows Us the Father'}</p> : null}
        <p>Then examine the picture of God you actually expect and live from.</p>
        <ol className="see-clearly-movement__lessons" aria-label="See God Clearly modules">
          {godLessons.map((title, index) => <li key={title} id={`see-god-sg${index + 1}`}><span className="see-clearly-movement__number">SG{index + 1}</span><span>{title}</span>
            {index === 0 && sy4Status === 'review' ? <Link className="button button--secondary" href={`/deep-dive/see-clearly/the-god-i-learned${sg1Status === 'review' ? '?section=entry' : ''}`}>{sg1Status === 'review' ? 'Review' : sg1Status === 'resume' ? 'Resume' : 'Begin'} SG1</Link> : null}
            {index === 1 && sg1Status === 'review' ? <Link className="button button--secondary" href={`/deep-dive/see-clearly/what-i-expect-from-god${sg2Status === 'review' ? '?section=entry' : ''}`}>{sg2Status === 'review' ? 'Review' : sg2Status === 'resume' ? 'Resume' : 'Begin'} SG2</Link> : null}
            {index === 2 && sg2Status === 'review' ? <Link className="button button--secondary" href={`/deep-dive/see-clearly/jesus-shows-us-the-father${sg3Status === 'review' ? '?section=entry' : ''}`}>{sg3Status === 'review' ? 'Review' : sg3Status === 'resume' ? 'Resume' : 'Begin'} SG3</Link> : null}</li>)}
        </ol>
      </section>
    </div>
  </section>;
}
