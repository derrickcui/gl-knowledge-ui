import "./globals.css";
import { AppDrawer } from "@/components/drawer/app-drawer";

export const metadata = {
  title: "Geelink Knowledge UI",
  description: "Glossary & Topic Manager"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body className="h-screen w-screen overflow-hidden">
        <div className="flex h-full w-full">
          <AppDrawer />
          <main className="flex-1 overflow-auto scrollbar-thin">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
