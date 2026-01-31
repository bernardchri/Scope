
import '../styles/global.css';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={` antialiased`}
      >
        <nav className="flex gap-2 justify-between align-baseline items-center">
          <a href="/">Accueil</a>
          <a href="/test-store">Test Store</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
