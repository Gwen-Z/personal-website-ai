export function Footer() {
  return (
    <footer className="w-full py-12 bg-white/20 backdrop-blur-sm border-t border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4">
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-8">
            <a
              href="#privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </a>
          </div>
          <p className="text-muted-foreground">
            © 2025 EchoNotes. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}