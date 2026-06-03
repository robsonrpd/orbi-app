import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbi. — Atendimento com inteligência",
  description: "O sistema que trabalha enquanto você descansa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
