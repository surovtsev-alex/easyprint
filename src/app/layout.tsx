import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyPrint — 3D Modeling",
  description: "Web-based 3D modeling application for 3D printing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
