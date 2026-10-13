import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_USER_ID, tarotSpreads, useTarotStore } from '@/lib/store';
import { tarotCards } from '@/lib/tarot-data';
import HistoryPage from '@/app/history/page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
describe('用户历史界面', () => {
  beforeEach(() => useTarotStore.setState({ users: [{ id: DEFAULT_USER_ID, name: '默认' }, { id: 'a', name: '用户A' }, { id: 'b', name: '用户B' }], activeUserId: 'a', readings: [
    { id: 'ra', userId: 'a', question: 'A的考试问题', spread: tarotSpreads[0], cards: [tarotCards[0]], cardReversals: [true], interpretation: 'A的解读', advice: 'A建议', timestamp: new Date() },
    { id: 'rb', userId: 'b', question: 'B的收入问题', spread: tarotSpreads[0], cards: [tarotCards[1]], cardReversals: [false], interpretation: 'B的解读', advice: 'B建议', timestamp: new Date() },
  ] }));
  it('只显示当前用户，展开显示原牌与方向，切换后原用户内容隐藏', () => {
    render(<HistoryPage />);
    expect(screen.getByText('A的考试问题')).toBeInTheDocument();
    expect(screen.queryByText('B的收入问题')).toBeNull();
    fireEvent.click(screen.getByText('A的考试问题'));
    expect(screen.getByText('核心指引：愚者 · 逆位')).toBeInTheDocument();
    act(() => useTarotStore.getState().switchUser('b'));
    expect(screen.getByText('B的收入问题')).toBeInTheDocument();
    expect(screen.queryByText('A的考试问题')).toBeNull();
    expect(screen.queryByText('A的解读')).toBeNull();
  });
});
