import { useState } from 'react';

interface Bubble {
  id: string;
  label: string;
  size: 'large' | 'medium' | 'small';
  gradient: string;
  x: number;
  y: number;
}

const bubbles: Bubble[] = [
  { id: '1', label: '心情', size: 'large', gradient: 'bg-gradient-to-br from-purple-200 via-purple-300 to-purple-400', x: 20, y: 30 },
  { id: '2', label: 'AI', size: 'large', gradient: 'bg-gradient-to-br from-purple-300 via-purple-400 to-purple-500', x: 70, y: 25 },
  { id: '3', label: '金融', size: 'medium', gradient: 'bg-gradient-to-br from-purple-100 via-purple-200 to-purple-300', x: 15, y: 70 },
  { id: '4', label: '健身', size: 'medium', gradient: 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600', x: 60, y: 65 },
  { id: '5', label: '美食', size: 'small', gradient: 'bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200', x: 85, y: 70 },
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
              className={`absolute ${sizeClasses[bubble.size]} rounded-full cursor-pointer transition-all duration-500 hover:scale-110 group`}
              style={{
                left: `${bubble.x}%`,
                top: `${bubble.y}%`,
                transform: 'translate(-50%, -50%)',
                opacity: hoveredBubble && hoveredBubble !== bubble.id ? 0.6 : 1,
              }}
              onMouseEnter={() => setHoveredBubble(bubble.id)}
              onMouseLeave={() => setHoveredBubble(null)}
            >
              {/* Main bubble with gradient */}
              <div className={`w-full h-full ${bubble.gradient} rounded-full shadow-2xl flex items-center justify-center relative overflow-hidden`}>
                {/* Inner light effect */}
                <div className="absolute inset-2 bg-white/20 rounded-full blur-sm"></div>
                {/* Top highlight */}
                <div className="absolute top-2 left-1/4 w-1/3 h-1/4 bg-white/40 rounded-full blur-lg"></div>
                {/* Text */}
                <span className="text-white font-medium text-lg sm:text-xl relative z-10 drop-shadow-lg">
                  {bubble.label}
                </span>
              </div>
              
              {/* Outer glow effect */}
              <div 
                className={`absolute inset-0 ${bubble.gradient} rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500`}
                style={{ transform: 'scale(1.2)' }}
              ></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}