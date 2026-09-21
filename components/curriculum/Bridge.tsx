import type { BridgeDefinition } from '../../domain/curriculum';
import Link from 'next/link';
import { Teaching } from './Teaching';

export function Bridge({ content }: { content: BridgeDefinition }) {
  return <><Teaching title={content.title}>{content.teaching}</Teaching><Link className="button" href={`/formation/${content.targetNodeId}`}>Continue</Link></>;
}
