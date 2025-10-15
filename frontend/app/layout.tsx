import "./globals.css";
import { ReactNode } from "react";
import ConnectWalletButton from "../components/ConnectWalletButton";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>CookBook - Blockchain Recipe Platform</title>
      </head>
      <body className="bg-milk text-coffee min-h-screen">
        <nav className="sticky top-0 z-50 w-full px-8 py-5 bg-gradient-to-r from-cream to-yellow-100 shadow-md border-b-2 border-coffee/10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a href="/" className="flex items-center gap-3 group">
              <div className="text-4xl">🍳</div>
              <div className="font-bold text-3xl text-coffee tracking-tight group-hover:text-tomato transition-colors">
                CookBook
              </div>
            </a>
            <div className="flex items-center gap-6">
              <a href="/" className="px-4 py-2 rounded-full hover:bg-white/60 transition-all font-medium">
                Home
              </a>
              <a href="/publish" className="px-4 py-2 rounded-full hover:bg-white/60 transition-all font-medium">
                Publish
              </a>
              <a href="/mine" className="px-4 py-2 rounded-full hover:bg-white/60 transition-all font-medium">
                My Recipes
              </a>
              <ConnectWalletButton />
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-8 py-12">{children}</main>
        <footer className="mt-20 py-8 bg-cream border-t border-coffee/10">
          <div className="max-w-7xl mx-auto px-8 text-center text-coffee/60">
            <p>🍰 CookBook - Decentralized Recipe Platform powered by FHEVM</p>
          </div>
        </footer>
      </body>
    </html>
  );
}


