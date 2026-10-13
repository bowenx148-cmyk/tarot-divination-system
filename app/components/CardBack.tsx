"use client";

// 牌背视觉（规格 G17）：网格中的未选牌位与揭示浮层的飞行元素共用同一份标记。
// 必须共用——飞行元素在 t=0 要看起来和它替换掉的那个格子**完全一样**，
// 否则起飞的瞬间会闪一下（两个各自维护的牌背迟早会漂移）。
export function CardBack({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-full h-full bg-gradient-to-br from-purple-800 via-blue-900 to-purple-900 rounded-[3px] md:rounded-md border border-purple-300/80 shadow-sm flex items-center justify-center overflow-hidden ${className}`}
    >
      <div className="text-center text-white/80">
        <div className="text-lg md:text-2xl mb-1">🌟</div>
        <div className="text-xs font-medium tracking-wider">TAROT</div>
      </div>
    </div>
  );
}
