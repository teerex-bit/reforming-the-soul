import type { BridgeDefinition } from '../../domain/curriculum';
import { Teaching } from './Teaching';

export function Bridge({ content }: { content: BridgeDefinition }) {
  return <Teaching title={content.title}>{content.teaching}</Teaching>;
}
