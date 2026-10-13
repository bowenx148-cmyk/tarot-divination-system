import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useTarotStore } from '@/lib/store';
import Home from '@/app/page';
import CardsPage from '@/app/cards/page';
import { tarotCards } from '@/lib/tarot-data';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

describe('多牌入口和本地牌义手册', () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
    useTarotStore.setState({ question: '', profile: { nickname: '', birthday: '', background: '' }, trialUsed: false, apiKey: '', encryptedApiKey: null });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(url.includes('trial-status') ? { trialUsed: false, remaining: 1 } : { questions: [] })));
  });
  it('默认三张，手动七张与背景一起传入抽牌流程', async () => {
    render(<Home />);
    await waitFor(() => expect(screen.getByLabelText('你的问题')).toBeInTheDocument());
    expect(screen.queryByText('猜你想问')).not.toBeInTheDocument();
    expect(screen.getByText('本次抽 3 张：现状 → 影响因素 → 建议')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /生命指引/ }));
    fireEvent.change(screen.getByLabelText('你的问题'), { target: { value: '想理清下一步' } });
    fireEvent.change(screen.getByLabelText('昵称'), { target: { value: '小雨' } });
    fireEvent.click(screen.getByRole('button', { name: '开始占卜' }));
    expect(push).toHaveBeenCalledWith('/draw/select');
    expect(useTarotStore.getState().selectedSlots).toEqual(Array(7).fill(null));
    expect(new Set(useTarotStore.getState().deckOrder).size).toBe(78);
    expect(useTarotStore.getState().recommendedSpread?.cardCount).toBe(7);
    expect(useTarotStore.getState().profile.nickname).toBe('小雨');
  });
  it('手册包含全部78张，支持中文搜索与正逆位切换', () => {
    render(<CardsPage />);
    expect(screen.getByRole('status')).toHaveTextContent('找到 78 张牌');
    fireEvent.change(screen.getByLabelText('搜索牌名或关键词'), { target: { value: '权杖六' } });
    expect(screen.getByRole('status')).toHaveTextContent('找到 1 张牌');
    const card = tarotCards.find(c => c.name === '权杖六')!;
    expect(screen.getByText(card.meaningUpright)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('查看逆位'));
    expect(screen.getByText(card.meaningReversed)).toBeInTheDocument();
    expect(screen.queryByText(card.meaningUpright)).toBeNull();
  });
});
