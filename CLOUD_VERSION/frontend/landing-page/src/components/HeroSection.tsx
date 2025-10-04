import { Button } from "./UI/button";

export function HeroSection() {
  return (
    <section className="w-full h-screen flex items-center justify-center bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-8">
          {/* Main Title */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl text-primary tracking-tight">
              了解自己，从第一个笔记开始
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Echo begins with the first note
            </p>
          </div>
          
          {/* CTA Button */}
          <div className="pt-8">
            <Button 
              size="lg" 
              className="text-lg bg-purple-600 text-white hover:bg-purple-700"
            >
              立即试用
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}