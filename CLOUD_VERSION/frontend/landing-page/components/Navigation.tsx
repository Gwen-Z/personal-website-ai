import { Button } from "./ui/button";

export function Navigation() {
  return (
    <nav className="w-full border-b border-white/20 bg-white/30 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h2 className="text-primary">EchoNotes</h2>
          </div>
          
          {/* Navigation Links */}
          <div className="hidden md:block">
            <div className="flex items-baseline space-x-8">
              <a 
                href="#login" 
                className="text-muted-foreground hover:text-foreground px-3 py-2 transition-colors"
              >
                登录
              </a>
              <a 
                href="#features" 
                className="text-muted-foreground hover:text-foreground px-3 py-2 transition-colors"
              >
                功能介绍
              </a>
              <a 
                href="#about" 
                className="text-muted-foreground hover:text-foreground px-3 py-2 transition-colors"
              >
                关于我们
              </a>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button variant="ghost" size="sm">
              菜单
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}