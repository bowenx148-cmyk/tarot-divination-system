import { KnowledgeReference } from '@/lib/knowledge-types';
export function KnowledgeReferences({ references = [] }: { references?: KnowledgeReference[] }) {
  if (!references.length) return null;
  return <section className="mt-4 rounded-lg border border-purple-300 p-4" aria-label="本次知识参考"><p className="text-sm leading-6">本次提供的资料：{references.slice(0, 3).map(reference => reference.title).join('；')}{references.length > 3 ? ` 等 ${references.length} 条` : ''}</p><details className="mt-2"><summary className="cursor-pointer">查看本次参考依据（{references.length}条）</summary>
    <p className="my-3 text-sm">以下资料已随本次请求提供给模型，显示的是当时的快照，不代表模型逐字引用或资料证明预测准确。</p>
    {references.map(reference => <article key={reference.id} className="mt-3 border-t border-purple-200 pt-3"><h3 className="font-semibold">{reference.title}</h3><p className="text-xs">出处：{reference.source || '开发者自编资料'}</p><p className="mt-2 whitespace-pre-wrap text-sm">{reference.content}</p></article>)}
  </details></section>;
}
