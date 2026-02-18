import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 주제추천 에이전트 | Topic Generator",
  description:
    "한국 트렌드 분석 → 타이탄 방법론 매칭 → 영상 주제 + 도구 아이디어 자동 추천",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
