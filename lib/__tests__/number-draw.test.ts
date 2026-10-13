import { describe, expect, it } from 'vitest';
import { parseCardNumbers } from '@/lib/number-draw';
describe('报数验证', () => {
  it('空格、中文逗号与顿号均按输入顺序解析', () => expect(parseCardNumbers('78，1、23', 3)).toEqual([78, 1, 23]));
  it.each(['0,12', '79,12', '1,1', '1.5,12', '1e1,12', 'a,12', '1', ''])('拒绝格式、数量或范围错误：%s', input => expect(() => parseCardNumbers(input, 2)).toThrow());
  it('拒绝本局已经选择的牌', () => expect(() => parseCardNumbers('1,12', 2, [12])).toThrow('已经选过'));
});
