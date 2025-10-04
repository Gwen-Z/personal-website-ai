export function Footer() {
    return (
      <footer className="w-full h-16 bg-white/20 backdrop-blur-sm border-t border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex flex-col justify-center items-center h-full space-y-1">
            <div className="flex justify-center items-center space-x-6">
              <a
                href="#privacy"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="#terms"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              © 2025 EchoNotes. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    );
  }