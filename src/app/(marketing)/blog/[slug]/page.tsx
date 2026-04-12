import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const POSTS: Record<string, {
  title: string; date: string; tag: string; readTime: string; content: string
}> = {
  'owasp-top-10-2021-explained': {
    title: 'OWASP Top 10 2021: What Changed and Why It Matters',
    date: 'December 15, 2024',
    tag: 'Security',
    readTime: '8 min',
    content: `
The OWASP Top 10 is the de facto standard for web application security. The 2021 update brought significant structural changes compared to the 2017 edition.

## What's New in 2021

**A01: Broken Access Control** moved to #1, up from #5. Access control failures remain the most common vulnerability — improper enforcement of user permissions allowing vertical and horizontal privilege escalation.

**A04: Insecure Design** is entirely new. This category reflects systemic design flaws rather than implementation bugs. No amount of code hardening can fix missing threat modeling or insecure design patterns.

**A08: Software and Data Integrity Failures** is also new, covering CI/CD pipeline integrity, auto-update mechanisms, and deserialization issues.

## How VAULTRIX Covers OWASP Top 10

Our scanner maps every finding to an OWASP 2021 control. When you run a compliance scan, you get a breakdown of your coverage across all 10 categories with evidence-backed pass/fail status.
    `.trim(),
  },
  'http-security-headers-guide': {
    title: 'The Complete Guide to HTTP Security Headers in 2025',
    date: 'November 28, 2024',
    tag: 'Best Practices',
    readTime: '12 min',
    content: `
HTTP security headers are your first line of defense against common web attacks. Correctly configured headers can prevent XSS, clickjacking, MIME-sniffing, and more.

## The Essential Headers

**Content-Security-Policy (CSP)** is the most powerful. A strict CSP prevents injection of malicious scripts. Start with \`default-src 'self'\` and build from there.

**Strict-Transport-Security (HSTS)** forces HTTPS. Always include \`includeSubDomains\` and consider \`preload\` for maximum protection. Minimum \`max-age\` should be 31536000 (1 year).

**X-Frame-Options** prevents clickjacking. Use \`DENY\` or \`SAMEORIGIN\`. Note: this is superseded by CSP's \`frame-ancestors\` directive but still important for older browser compatibility.

**Permissions-Policy** (formerly Feature-Policy) controls which browser features your page can use. Restrict camera, microphone, geolocation to only what you need.

## Quick Test

VAULTRIX checks all 13 security headers in every scan, provides specific remediation guidance, and tracks your header score over time.
    `.trim(),
  },
  'cors-misconfigurations': {
    title: 'CORS Misconfigurations: How Attackers Exploit Them',
    date: 'November 10, 2024',
    tag: 'Vulnerabilities',
    readTime: '6 min',
    content: `
Cross-Origin Resource Sharing misconfigurations are one of the most common and impactful web vulnerabilities. A misconfigured CORS policy can lead to complete account takeover.

## The Wildcard Problem

Setting \`Access-Control-Allow-Origin: *\` seems convenient but is dangerous when combined with \`Access-Control-Allow-Credentials: true\`. This combination is actually blocked by browsers — but many developers work around it by reflecting the request Origin back.

## Reflected Origin Attack

When a server reflects the request's \`Origin\` header directly into \`Access-Control-Allow-Origin\`, any site can make credentialed cross-origin requests. An attacker can:

1. Trick a victim into visiting their site
2. Make a credentialed fetch to the vulnerable API
3. Steal sensitive data — session tokens, PII, account data

## VAULTRIX Detection

Our CORS scanner sends probe requests from a synthetic attacker origin and checks if it's reflected with credentials enabled. Critical misconfigurations are flagged immediately with exploitation potential noted.
    `.trim(),
  },
  'tls-configuration-best-practices': {
    title: 'TLS Configuration Best Practices for Production',
    date: 'October 22, 2024',
    tag: 'SSL/TLS',
    readTime: '10 min',
    content: `
Getting TLS right is fundamental to web security. A misconfigured TLS setup can expose your users to downgrade attacks, eavesdropping, and certificate spoofing.

## Protocol Versions

Only TLS 1.2 and TLS 1.3 should be enabled in production. TLS 1.0 and 1.1 are deprecated (RFC 8996). SSLv3 has been broken since POODLE (CVE-2014-3566).

TLS 1.3 is preferred — it removes weak cipher suites, reduces handshake latency, and provides perfect forward secrecy by default.

## Cipher Suites

Avoid: RC4, DES, 3DES, EXPORT ciphers, NULL ciphers. These are broken and should never appear in your config.

Prefer: AES-GCM, ChaCha20-Poly1305 with ECDHE key exchange.

## Certificate Best Practices

- Use at least 2048-bit RSA keys (4096-bit recommended for CAs)
- Prefer ECDSA P-256 for smaller, faster certificates
- Don't use SHA-1 signatures — use SHA-256 or better
- Set up CAA DNS records to restrict which CAs can issue for your domain
- Enable HSTS preloading after confirming your configuration is stable

## VAULTRIX SSL Scanner

Every VAULTRIX scan checks TLS version support, cipher suites, certificate validity, and HSTS configuration — giving you a comprehensive SSL/TLS health score.
    `.trim(),
  },
}

interface Props {
  params: { slug: string }
}

export default function BlogPostPage({ params }: Props) {
  const post = POSTS[params.slug]
  if (!post) notFound()

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <Link href="/blog" className="flex items-center gap-2 text-sm text-[#8888aa] hover:text-[#4ade80] transition-colors mb-8">
        <ArrowLeft className="h-4 w-4" /> Back to Blog
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 font-heading font-semibold">
          {post.tag}
        </span>
        <span className="text-xs text-[#3a3a5c]">{post.readTime} read</span>
        <span className="text-xs text-[#3a3a5c]">{post.date}</span>
      </div>

      <h1 className="text-3xl font-heading font-bold text-[#f0f0ff] mb-8">{post.title}</h1>

      <div className="prose prose-invert max-w-none">
        {post.content.split('\n\n').map((block, i) => {
          if (block.startsWith('## ')) {
            return <h2 key={i} className="text-lg font-heading font-bold text-[#f0f0ff] mt-8 mb-3">{block.slice(3)}</h2>
          }
          if (block.startsWith('**') && block.includes('**')) {
            return (
              <p key={i} className="text-[#8888aa] leading-relaxed mb-4">
                {block.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                  part.startsWith('**') && part.endsWith('**')
                    ? <strong key={j} className="text-[#f0f0ff]">{part.slice(2, -2)}</strong>
                    : part
                )}
              </p>
            )
          }
          return <p key={i} className="text-[#8888aa] leading-relaxed mb-4">{block}</p>
        })}
      </div>
    </div>
  )
}
