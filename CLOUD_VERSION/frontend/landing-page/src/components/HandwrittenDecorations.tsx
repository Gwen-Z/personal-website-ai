export function HandwrittenDecorations() {
  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {/* 手写风格的装饰线条 */}
      <svg 
        className="absolute top-20 left-10 w-32 h-32 text-purple-200 opacity-30"
        viewBox="0 0 100 100"
      >
        <path
          d="M10,20 Q30,10 50,30 T90,25"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="animate-pulse"
        />
      </svg>
      
      <svg 
        className="absolute top-40 right-20 w-24 h-24 text-blue-200 opacity-30"
        viewBox="0 0 100 100"
      >
        <path
          d="M20,10 Q40,30 60,20 T80,40"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </svg>
      
      <svg 
        className="absolute bottom-32 left-20 w-28 h-28 text-pink-200 opacity-30"
        viewBox="0 0 100 100"
      >
        <path
          d="M15,80 Q35,60 55,80 T85,70"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="animate-pulse"
          style={{ animationDelay: '2s' }}
        />
      </svg>
      
      {/* 手写风格的文字装饰 */}
      <div className="absolute top-32 right-10 text-purple-200 opacity-20 transform rotate-12">
        <span className="text-sm font-handwriting">记录生活</span>
      </div>
      
      <div className="absolute bottom-40 right-16 text-blue-200 opacity-20 transform -rotate-6">
        <span className="text-sm font-handwriting">思考成长</span>
      </div>
      
      <div className="absolute top-60 left-16 text-pink-200 opacity-20 transform rotate-3">
        <span className="text-sm font-handwriting">发现美好</span>
      </div>
    </div>
  );
}
