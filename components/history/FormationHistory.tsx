import type { FormationHistoryItem, HistoryArtifact } from '../../server/data/history-repository';
import { ProvenanceBadge } from '../design-system/ProvenanceBadge';
import { DeleteJournalEntry } from './DeleteJournalEntry';

function label(value: string) { return value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase()); }
function artifactText(artifact: HistoryArtifact) {
  const preferred = artifact.content.summary ?? artifact.content.tag ?? artifact.content.suggestion;
  return typeof preferred === 'string' ? preferred : JSON.stringify(artifact.content);
}

export function FormationHistory({ items }: Readonly<{ items: readonly FormationHistoryItem[] }>) {
  if (!items.length) return <p className="history-empty">Your formation history will appear here after you save a reflection.</p>;
  return <ol className="history-list">
    {items.map(item => <li className="history-entry" key={item.journal.id}>
      <article aria-labelledby={`history-${item.journal.id}`}>
        <header className="history-entry__header">
          <div><p className="eyebrow">{label(item.journal.entryKind)}</p><h2 id={`history-${item.journal.id}`}>{label(item.journal.nodeId.split('.')[0])}</h2></div>
          <time dateTime={item.journal.createdAt}>{new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(item.journal.createdAt))}</time>
        </header>
        <section className="history-record" data-testid={`history-user-wording-${item.journal.id}`} aria-label="Original user wording">
          <ProvenanceBadge kind="user" /><p className="history-wording">{item.journal.body}</p>
        </section>
        {item.records.map(record => <section className="history-record" key={record.id} aria-label="Structured formation record">
          <ProvenanceBadge kind={record.provenance === 'user_confirmed_ai' ? 'ai-confirmed' : 'structured'} />
          <h3>{label(record.recordType)}</h3><p>{record.value}</p>
        </section>)}
        {item.artifacts.map(artifact => <section className="history-record history-record--ai" key={artifact.id} aria-label="AI-derived artifact">
          <ProvenanceBadge kind={artifact.provenance === 'user_confirmed_ai' ? 'ai-confirmed' : 'ai-suggestion'} />
          <h3>{label(artifact.artifactType)}</h3><p>{artifactText(artifact)}</p>
          <dl className="history-provenance"><div><dt>Provenance</dt><dd>{artifact.provenance === 'ai_suggested' ? 'AI-derived suggestion' : 'User-confirmed AI suggestion'} · {label(artifact.status)}</dd></div><div><dt>Curriculum</dt><dd>{artifact.curriculumVersionId}</dd></div><div><dt>Model</dt><dd>{artifact.modelId}</dd></div><div><dt>Policy versions</dt><dd>{artifact.policy.global} · {artifact.policy.stage} · {artifact.policy.mode} · {artifact.policy.outputSchema}</dd></div><div><dt>Sources</dt><dd>{artifact.sources.map(source => source.role === 'current' ? `Current entry (${source.journalEntryId})` : `Selected prior entry (${source.journalEntryId}), grant ${source.contextGrantId} revision ${source.grantRevision}`).join('; ')}</dd></div></dl>
        </section>)}
        <DeleteJournalEntry entryId={item.journal.id} />
      </article>
    </li>)}
  </ol>;
}
