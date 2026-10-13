export interface KnowledgeEntry {
  id: string;
  title: string;
  source: string;
  topic: string;
  cardIds: string[];
  orientation: 'any' | 'upright' | 'reversed';
  position: string;
  content: string;
  enabled: boolean;
}
export interface KnowledgeRequest {
  question: string;
  topic?: string;
  cards: { id: string; reversed: boolean; position: string }[];
}
export interface KnowledgeReference { id: string; title: string; source: string; content: string }
