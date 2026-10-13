import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Home from '@/app/page';
import { DEFAULT_USER_ID, tarotSpreads, useTarotStore } from '@/lib/store';
import { spreadLayouts } from '@/lib/spread-layouts';
import { SpreadDiagram } from '@/app/components/SpreadGallery';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

describe('可视化牌阵选择与分层介绍', () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
    useTarotStore.setState({ users: [{ id: DEFAULT_USER_ID, name: '默认用户' }], activeUserId: DEFAULT_USER_ID, question: '', profile: { nickname: '', birthday: '', background: '' }, trialUsed: false, apiKey: '', encryptedApiKey: null });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(url.includes('trial-status') ? { trialUsed: false, remaining: 1 } : { questions: [] })));
  });

  it('首页简洁罗列；点击卡片区域进入详情，返回后可以改选并确认', () => {
    render(<Home />);
    expect(screen.getAllByRole('radio')).toHaveLength(19);
    expect(screen.queryByText('每张牌代表什么')).toBeNull();
    fireEvent.click(screen.getByText('得与失'));
    const detail = screen.getByRole('region', { name: '得与失详细说明' });
    expect(within(detail).getByText('我将失去什么')).toBeInTheDocument();
    expect(within(detail).getByText('我将得到什么')).toBeInTheDocument();
    expect(screen.getByText('本次抽 2 张：我将失去什么 → 我将得到什么')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '得与失 · 2 张' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '返回牌阵列表' }));
    expect(screen.getByRole('radio', { name: /得与失/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /得与失/ })).toHaveFocus();
    fireEvent.click(screen.getByRole('radio', { name: /二选一牌阵/ }));
    expect(screen.getByText(/A 留在当前岗位/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认使用这个牌阵' }));
    expect(screen.getByRole('radio', { name: /二选一牌阵/ })).toBeChecked();
    expect(screen.queryByText('每张牌代表什么')).toBeNull();
  });

  it('选择八牌后按八个牌位进入真实抽牌流程', () => {
    render(<Home />);
    fireEvent.click(screen.getByRole('radio', { name: /维纳斯牌阵/ }));
    const spread = tarotSpreads.find(s => s.id === 'venus')!;
    const detail = screen.getByRole('region', { name: '维纳斯牌阵详细说明' });
    expect(within(detail).getAllByRole('listitem')).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: '确认使用这个牌阵' }));
    fireEvent.change(screen.getByLabelText('你的问题'), { target: { value: '我想了解这段关系接下来三个月的沟通方式' } });
    fireEvent.click(screen.getByRole('button', { name: '开始占卜' }));
    expect(push).toHaveBeenCalledWith('/draw/select');
    expect(useTarotStore.getState().selectedSlots).toEqual(Array(8).fill(null));
    expect(useTarotStore.getState().recommendedSpread).toEqual(spread);
  });

  it('查看详情后仍能切回自动推荐，问题变化会更新牌阵', () => {
    render(<Home />);
    fireEvent.click(screen.getByRole('radio', { name: /钻石牌阵/ }));
    fireEvent.click(screen.getByRole('radio', { name: '自动推荐' }));
    expect(screen.queryByText('每张牌代表什么')).toBeNull();
    fireEvent.change(screen.getByLabelText('你的问题'), { target: { value: '未来三个月的发展趋势' } });
    expect(screen.getByText('本次抽 3 张：过去 → 现在 → 未来')).toBeInTheDocument();
  });

  it('须知默认可见；任意自由提问实时分类，限制预测，牌阵类别可筛选', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: '占卜须知' })).toBeInTheDocument();
    expect(screen.getByText(/不承诺100%准确/)).toBeInTheDocument();
    expect(screen.queryByText('猜你想问')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('你的问题'), { target: { value: '我什么时候死' } });
    expect(screen.getByRole('button', { name: '开始占卜' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('不能用牌预测生死');
    fireEvent.change(screen.getByLabelText('你的问题'), { target: { value: '我与家人之间要如何沟通' } });
    expect(screen.getByRole('status')).toHaveTextContent('家庭');
    fireEvent.change(screen.getByLabelText('按问题种类查看牌阵'), { target: { value: 'growth' } });
    expect(screen.getByRole('radio', { name: /荣格原型/ })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /维纳斯牌阵/ })).toBeNull();
    fireEvent.change(screen.getByLabelText('按问题种类查看牌阵'), { target: { value: 'all' } });
    expect(screen.getAllByRole('radio')).toHaveLength(19);
    fireEvent.change(screen.getByLabelText('你的问题'), { target: { value: '搬去陌生城市，我能先做什么' } });
    fireEvent.click(screen.getByRole('button', { name: '开始占卜' }));
    expect(push).toHaveBeenCalledWith('/draw/select');
    expect(useTarotStore.getState().question).toBe('搬去陌生城市，我能先做什么');
  });

  it.each(tarotSpreads)('$name 图中每个编号都对应一个牌位，坐标不裁切、不重叠', spread => {
    const layout = spreadLayouts[spread.id];
    expect(layout).toHaveLength(spread.cardCount);
    expect(spread.positions).toHaveLength(spread.cardCount);
    for (const [i, [x, y]] of layout.entries()) {
      expect(x).toBeGreaterThanOrEqual(17); expect(x).toBeLessThanOrEqual(243);
      expect(y).toBeGreaterThanOrEqual(23); expect(y).toBeLessThanOrEqual(167);
      for (const [otherX, otherY] of layout.slice(i + 1)) {
        expect(Math.abs(x - otherX) >= 34 || Math.abs(y - otherY) >= 46).toBe(true);
      }
    }
    const { container } = render(<SpreadDiagram spread={spread} />);
    expect(Array.from(container.querySelectorAll('[data-card-number]')).map(node => node.getAttribute('data-card-number'))).toEqual(spread.positions.map((_, i) => String(i + 1)));
  });
});
