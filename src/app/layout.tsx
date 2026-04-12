import type { Metadata } from 'next'
import { Chakra_Petch, DM_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { QueryProvider } from '@/components/providers/query-provider'

const chakraPetch = Chakra_Petch({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-chakra',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'VAULTRIX — Scan. Detect. Fortify.',
    template: '%s | VAULTRIX',
  },
  description:
    'Enterprise-grade web security scanning. Find vulnerabilities, misconfigurations, and compliance gaps before hackers do.',
  keywords: ['web security', 'vulnerability scanner', 'SSL check', 'security audit', 'OWASP'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://vaultrix.io'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://vaultrix.io',
    siteName: 'VAULTRIX',
    title: 'VAULTRIX — Scan. Detect. Fortify.',
    description: 'Enterprise-grade web security scanning for businesses.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VAULTRIX — Scan. Detect. Fortify.',
    description: 'Enterprise-grade web security scanning for businesses.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${chakraPetch.variable} ${dmMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased" style={{ background: '#050508' }}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster
              theme="dark"
              position="bottom-right"
              toastOptions={{
                style: {
                  background: '#111120',
                  border: '1px solid #1e1e35',
                  color: '#f0f0ff',
                  fontFamily: 'var(--font-dm-mono)',
                },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
