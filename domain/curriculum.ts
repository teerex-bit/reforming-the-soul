import { STAGE_ORDER, type StageId } from './stages';

export const INTERACTION_TYPES = [
  'orient', 'teach', 'scripture', 'notice', 'name', 'interpret', 'reflect',
  'practice', 'return', 'ai_explain', 'ai_reflect', 'ai_guide', 'route', 'carry_forward',
] as const;
export type InteractionType = typeof INTERACTION_TYPES[number];
export type CurriculumNodeKind = 'module' | 'session' | 'interaction' | 'bridge';
export type CurriculumNodeIdentity = Readonly<{ version: 'phase-1-v1'; nodeId: string }>;

export interface CurriculumModule {
  readonly kind: 'module';
  readonly title: string;
}

export interface CurriculumSession {
  readonly kind: 'session';
  readonly title: string;
  readonly teaching: string;
}

export interface InteractionField {
  readonly id: string;
  readonly input: 'text' | 'multiline' | 'single_choice';
  readonly required: boolean;
  readonly exactUserText: boolean;
  readonly options?: readonly string[];
}

export interface InteractionDefinition {
  readonly kind: 'interaction';
  readonly interactionType: InteractionType;
  readonly prompt?: string;
  readonly help?: string;
  readonly action?: string;
  readonly saveAction?: string;
  readonly closeAction?: string;
  readonly title?: string;
  readonly teaching?: string;
  readonly disclosure?: string;
  readonly output?: string;
  readonly fields?: readonly InteractionField[];
  readonly lifecycleTarget?: string;
  readonly aiContext?: Readonly<{ currentEntry: true; priorEntryAccess: 'none' }>;
}

export interface BridgeDefinition {
  readonly kind: 'bridge';
  readonly title: string;
  readonly teaching: string;
  readonly fromStage: StageId;
  readonly toStage: StageId;
  readonly targetNodeId: string;
}

export type CurriculumContent = CurriculumModule | CurriculumSession | InteractionDefinition | BridgeDefinition;

export interface CurriculumNode {
  readonly id: string;
  readonly version: 'phase-1-v1';
  readonly stage: StageId;
  readonly kind: CurriculumNodeKind;
  readonly parentId: string | null;
  readonly order: number;
  readonly content: CurriculumContent;
}

export interface CurriculumSeed {
  readonly version: 'phase-1-v1';
  readonly startNodeId: 'awaken.pay-attention.observe';
  readonly terminalNodeId: 'become.practice.review';
  readonly stages: typeof STAGE_ORDER;
  readonly nodes: readonly CurriculumNode[];
}

export const AUTHORIZED_PHASE_1_NODE_IDS = [
  'awaken.pay-attention', 'awaken.pay-attention.observe', 'awaken.pay-attention.inside',
  'awaken.pay-attention.body', 'awaken.pay-attention.reflect', 'bridge.awaken-see-clearly',
  'see-clearly.fact', 'see-clearly.interpretation', 'see-clearly.belief-expectation',
  'bridge.see-clearly-become', 'become.control', 'become.receive', 'become.next-step',
  'become.practice.open', 'become.practice.return', 'become.practice.review',
] as const;
export const AUTHORIZED_SEED_FINGERPRINT = 'aeed790c';

export function parseInteractionType(value: unknown): InteractionType {
  if (typeof value === 'string' && (INTERACTION_TYPES as readonly string[]).includes(value)) return value as InteractionType;
  throw new Error(`Invalid interaction type: ${String(value)}`);
}

const NODE_FIELDS = ['id', 'version', 'stage', 'kind', 'parentId', 'order', 'content'] as const;
const UI_KEYS = new Set(['component', 'className', 'layout', 'style', 'color', 'icon']);

export function validateCurriculumSeed(value: unknown): string[] {
  if (!value || typeof value !== 'object') return ['curriculum seed must be an object'];
  const seed = value as Record<string, unknown>;
  if (!Array.isArray(seed.nodes)) return ['curriculum seed nodes must be an array'];
  const issues: string[] = [];
  if (seed.version !== 'phase-1-v1') issues.push('curriculum version must be phase-1-v1');
  if (seed.startNodeId !== 'awaken.pay-attention.observe') issues.push('curriculum start node is invalid');
  if (seed.terminalNodeId !== 'become.practice.review') issues.push('curriculum terminal node is invalid');
  if (JSON.stringify(seed.stages) !== JSON.stringify(STAGE_ORDER)) issues.push('curriculum stage order is invalid');
  const nodes = seed.nodes as Array<Record<string, unknown>>;
  const ids = new Set<string>();
  const orders = new Set<number>();

  for (const node of nodes) {
    const id = String(node.id);
    if (ids.has(id)) issues.push(`duplicate curriculum node id: ${id}`);
    ids.add(id);
    const order = Number(node.order);
    if (orders.has(order)) issues.push(`duplicate curriculum node order: ${order}`);
    orders.add(order);
    if (!(AUTHORIZED_PHASE_1_NODE_IDS as readonly string[]).includes(id)) issues.push(`seed contains unauthorized node: ${id}`);
    const expectedOrder = (AUTHORIZED_PHASE_1_NODE_IDS as readonly string[]).indexOf(id) + 1;
    if (expectedOrder > 0 && order !== expectedOrder) issues.push(`node ${id} must have order ${expectedOrder}`);
    if (node.version !== 'phase-1-v1') issues.push(`node ${id} must use curriculum version phase-1-v1`);
    if (!(STAGE_ORDER as readonly unknown[]).includes(node.stage)) issues.push(`node ${id} has invalid stage: ${String(node.stage)}`);
    if (!['module', 'session', 'interaction', 'bridge'].includes(String(node.kind))) issues.push(`node ${id} has invalid kind: ${String(node.kind)}`);
    for (const key of Object.keys(node)) if (!NODE_FIELDS.includes(key as typeof NODE_FIELDS[number])) {
      issues.push(`node ${id} contains unsupported field: ${key}`);
    }
    findUiKeys(node.content, `node ${id}`, issues);
    const content = node.content as Record<string, unknown> | undefined;
    if (!content || content.kind !== node.kind) issues.push(`node ${id} content kind must match node kind`);
    if (node.kind === 'interaction') {
      if (!content || !(INTERACTION_TYPES as readonly unknown[]).includes(content.interactionType)) {
        issues.push(`node ${id} has invalid interaction type: ${String(content?.interactionType)}`);
      }
      if (!content?.prompt && !content?.title && !content?.action) issues.push(`node ${id} is missing an authored label`);
    }
  }

  for (const requiredId of AUTHORIZED_PHASE_1_NODE_IDS) if (!ids.has(requiredId)) {
    issues.push(`seed is missing authorized node: ${requiredId}`);
  }
  for (let order = 1; order <= AUTHORIZED_PHASE_1_NODE_IDS.length; order += 1) {
    if (!orders.has(order)) issues.push(`seed is missing curriculum order: ${order}`);
  }
  for (const node of nodes) {
    const id = String(node.id);
    if (typeof node.parentId === 'string') {
      const parent = nodes.find(candidate => candidate.id === node.parentId);
      if (!parent) issues.push(`node ${id} has missing parent: ${node.parentId}`);
      else if (parent.stage !== node.stage) issues.push(`node ${id} parent must be in the same stage`);
    }
    if (node.kind === 'bridge') {
      const content = node.content as Record<string, unknown>;
      const target = nodes.find(candidate => candidate.id === content.targetNodeId);
      if (!target) issues.push(`bridge ${id} target does not resolve: ${String(content.targetNodeId)}`);
      else if (target.stage !== content.toStage) issues.push(`bridge ${id} target stage does not match`);
    }
  }
  if (fingerprintCurriculumSeed(value) !== AUTHORIZED_SEED_FINGERPRINT) {
    issues.push('seed content fingerprint does not match the authorized vertical slice');
  }
  return issues;
}

function findUiKeys(value: unknown, label: string, issues: string[]): void {
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (UI_KEYS.has(key)) issues.push(`${label} content contains UI field: ${key}`);
    if (Array.isArray(nested)) nested.forEach(item => findUiKeys(item, label, issues));
    else findUiKeys(nested, label, issues);
  }
}

export function serializeCurriculumSeed(seed: CurriculumSeed): string {
  return JSON.stringify(seed);
}

export function fingerprintCurriculumSeed(seed: unknown): string {
  const serialized = JSON.stringify(seed);
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
