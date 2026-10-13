export function parseCardNumbers(input: string, count: number, used: number[] = []): number[] {
  const tokens = input.trim().split(/[\s,，、;；]+/).filter(Boolean);
  if (tokens.length !== count) throw new Error(`请填写 ${count} 个数字，分别对应剩余牌位。`);
  if (tokens.some(token => !/^\d+$/.test(token))) throw new Error('只支持1到78的整数，请用空格或逗号分隔。');
  const numbers = tokens.map(Number);
  if (numbers.some(number => number < 1 || number > 78)) throw new Error('数字必须在1到78之间。');
  if (new Set(numbers).size !== numbers.length) throw new Error('同一次报数不能重复。');
  if (numbers.some(number => used.includes(number))) throw new Error('这些数字中包含本局已经选过的牌，请换一个数字。');
  return numbers;
}
