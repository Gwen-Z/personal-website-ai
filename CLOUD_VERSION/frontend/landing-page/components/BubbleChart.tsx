import { useState } from 'react';

interface Bubble {
  id: string;
  label: string;
  size: 'large' | 'medium' | 'small';
  color: string;
  x: number;
  y: number;
}

const bubbles: Bubble[] = [
  { id: '1', label: '心情', size: 'large', color: 'bg-purple-500', x: 20, y: 30 },
  { id: '2', label: 'AI', size: 'large', color: 'bg-purple-600', x: 70, y: 25 },
  { id: '3', label: '金融', size: 'medium', color: 'bg-purple-400', x: 15, y: 70 },
  { id: '4', label: '健身', size: 'medium', color: 'bg-purple-700', x: 60, y: 65 },
  { id: '5', label: '美食', size: 'small', color: 'bg-purple-300', x: 85, y: 70 },
];

const sizeClasses = {
  large: 'w-32 h-32 sm:w-40 sm:h-40',
  medium: 'w-24 h-24 sm:w-28 sm:h-28',
  small: 'w-16 h-16 sm:w-20 sm:h-20',
};

export function BubbleChart() {
  const [hoveredBubble, setHoveredBubble] = useState<string | null>(null);

  return (
    <section className="w-full py-20 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl text-primary mb-4">多维度记录生活</h2>
          <p className="text-lg text-muted-foreground">用智能分类让笔记更有价值</p>
        </div>
        
        <div className="relative w-full h-96 sm:h-[500px] mx-auto max-w-4xl">
          {bubbles.map((bubble) => (
            <div
              key={bubble.id}
              className={`absolute ${sizeClasses[bubble.size]} ${bubble.color} rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 shadow-lg`}
              style={{
                left: `${bubble.x}%`,
                top: `${bubble.y}%`,
                transform: 'translate(-50%, -50%)',
                opacity: hoveredBubble && hoveredBubble !== bubble.id ? 0.6 : 1,
              }}
              onMouseEnter={() => setHoveredBubble(bubble.id)}
              onMouseLeave={() => setHoveredBubble(null)}
            >
              <span className="text-white font-medium text-lg sm:text-xl">
                {bubble.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}