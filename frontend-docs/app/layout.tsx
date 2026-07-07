import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import type { Metadata } from 'next';
import { appName, seoKeywords, siteUrl } from '@/lib/shared';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description: 'NeoCockpit 文档中心，提供 AI 生成车机主题、车载主题包、WEB 主题编辑器与安卓端应用能力说明。',
  keywords: seoKeywords,
  alternates: {
    canonical: '/docs',
  },
  openGraph: {
    title: appName,
    description: 'NeoCockpit 文档中心，了解 AI 生成车机主题与安卓端直接应用流程。',
    url: '/docs',
    siteName: 'NeoCockpit',
    locale: 'zh_CN',
    type: 'website',
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider theme={{ defaultTheme: 'system', enableSystem: true }}>{children}</RootProvider>
      </body>
    </html>
  );
}
