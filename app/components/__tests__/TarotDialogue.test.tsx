import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useTarotStore, tarotSpreads } from '@/lib/store';
import { tarotCards } from '@/lib/tarot-data';
import { TarotDialogue } from '../TarotDialogue';
import { streamTarotPrompt } from '@/lib/deepseek';

vi.mock('@/lib/deepseek', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/deepseek')>(), streamTarotPrompt: vi.fn(),
}));

describe('原牌组连续追问', () => {
  it('主动恢复历史时使用原牌、原问题和已有追问，不混入当前新局', async () => {
    const old = { id: 'past', question: '过去的工作问题', spread: tarotSpreads[0], cards: [tarotCards[4]], cardReversals: [false], interpretation: '原解读', advice: '', timestamp: new Date(), followups: [{ question: '之前的追问', answer: '之前的回答' }] };
    vi.mocked(streamTarotPrompt).mockImplementation(async (_, callbacks) => { callbacks.onContent('这次先整理沟通重点。'); callbacks.onComplete(); });
    render(<TarotDialogue interpretation={old.interpretation} readingId={old.id} reading={old} />);
    expect(screen.getByText('你：之前的追问')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('想继续问什么？'), { target: { value: '我已经沟通过了' } });
    fireEvent.click(screen.getByRole('button', { name: '继续提问' }));
    await waitFor(() => expect(streamTarotPrompt).toHaveBeenCalled());
    const prompt = vi.mocked(streamTarotPrompt).mock.calls.at(-1)![0];
    expect(prompt).toContain(old.question);
    expect(prompt).toContain(old.cards[0].name);
    expect(prompt).toContain('之前的回答');
    expect(prompt).not.toContain('怎样准备考试');
  });
  beforeEach(() => {
    vi.clearAllMocks();
    useTarotStore.setState({ question: '怎样准备考试', recommendedSpread: tarotSpreads[0], drawnCards: [tarotCards[0]], cardReversals: [true], apiKey: 'test-key', profile: { nickname: '', birthday: '', background: '紧张' }, readings: [{ id: 'record', question: '怎样准备考试', spread: tarotSpreads[0], cards: [tarotCards[0]], cardReversals: [true], interpretation: '首次解读', advice: '建议', timestamp: new Date() }] });
  });
  it('成功回复显示并写回原历史，后续问题包含上轮对话而不重新抽牌', async () => {
    vi.mocked(streamTarotPrompt).mockImplementation(async (_, callbacks) => { callbacks.onContent('先整理错题。'); callbacks.onComplete(); });
    render(<TarotDialogue interpretation="首次解读" readingId="record" />);
    fireEvent.change(screen.getByLabelText('想继续问什么？'), { target: { value: '下一步呢' } });
    fireEvent.click(screen.getByRole('button', { name: '继续提问' }));
    await waitFor(() => expect(screen.getByText('先整理错题。')).toBeInTheDocument());
    expect(useTarotStore.getState().readings).toHaveLength(1);
    expect(useTarotStore.getState().readings[0].followups?.[0]).toEqual({ question: '下一步呢', answer: '先整理错题。' });
    expect(vi.mocked(streamTarotPrompt).mock.calls[0][0]).toContain(tarotCards[0].meaningReversed);
    fireEvent.change(screen.getByLabelText('想继续问什么？'), { target: { value: '然后呢' } });
    fireEvent.click(screen.getByRole('button', { name: '继续提问' }));
    await waitFor(() => expect(streamTarotPrompt).toHaveBeenCalledTimes(2));
    expect(vi.mocked(streamTarotPrompt).mock.calls[1][0]).toContain('先整理错题。');
    expect(useTarotStore.getState().drawnCards).toEqual([tarotCards[0]]);
  });
  it('流中失败不保存部分回答，保留问题供重试', async () => {
    vi.mocked(streamTarotPrompt).mockImplementation(async (_, callbacks) => { callbacks.onContent('不完整'); callbacks.onError('网络错误'); });
    render(<TarotDialogue interpretation="首次解读" readingId="record" />);
    fireEvent.change(screen.getByLabelText('想继续问什么？'), { target: { value: '如何行动' } });
    fireEvent.click(screen.getByRole('button', { name: '继续提问' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('网络错误'));
    expect(screen.getByLabelText('想继续问什么？')).toHaveValue('如何行动');
    expect(screen.queryByText('不完整')).toBeNull();
    expect(useTarotStore.getState().readings[0].followups).toBeUndefined();
  });
});
