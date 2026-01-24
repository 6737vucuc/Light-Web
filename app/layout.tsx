import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Light of Life - Spreading Christ's Love and Peace",
  description: "A Christian ministry website dedicated to sharing the love and peace of Jesus Christ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
