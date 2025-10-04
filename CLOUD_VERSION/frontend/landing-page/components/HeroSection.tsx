import { Button } from "./ui/button";

export function HeroSection() {
  return (
    <section className="w-full py-20 lg:py-32 bg-transparent">
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
              className="px-8 py-4 text-lg rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              登录/注册
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}