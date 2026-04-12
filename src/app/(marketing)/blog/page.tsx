import Link from 'next/link'

const POSTS = [
  {
    slug: 'owasp-top-10-2021-explained',
    title: 'OWASP Top 10 2021: What Changed and Why It Matters',
    excerpt: 'The 2021 update brought significant changes including Insecure Design (A04) as a new category. Learn what each vulnerability means and how to test for it.',
    date: 'December 15, 2024',
    tag: 'Security',
    readTime: '8 min',
  },
  {
    slug: 'http-security-headers-guide',
    title: 'The Complete Guide to HTTP Security Headers in 2025',
    excerpt: 'Content-Security-Policy, HSTS, X-Frame-Options, and more. We cover every security header you should be setting and why.',
    date: 'November 28, 2024',
    tag: 'Best Practices',
    readTime: '12 min',
  },
  {
    slug: 'cors-misconfigurations',
    title: 'CORS Misconfigurations: How Attackers Exploit Them',
    excerpt: 'Wildcard origins, reflected Origin headers, and credentials with CORS — real-world attack scenarios and how to fix them.',
    date: 'November 10, 2024',
    tag: 'Vulnerabilities',
    readTime: '6 min',
  },
  {
    slug: 'tls-configuration-best-practices',
    title: 'TLS Configuration Best Practices for Production',
    excerpt: 'From cipher suite selection to HSTS preloading, everything you need to get an A+ on your SSL configuration.',
    date: 'October 22, 2024',
    tag: 'SSL/TLS',
    readTime: '10 min',
  },
]

export default function BlogPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-10">
        <h1 className="text-4xl font-heading font-bold text-[#f0f0ff] mb-4">Blog</h1>
        <p className="text-[#8888aa]">Security insights, best practices, and product updates</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {POSTS.map(post => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="vx-card p-5 hover:border-[#2a2a4a] transition-all group">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 font-heading font-semibold">
                {post.tag}
              </span>
              <span className="text-xs text-[#3a3a5c]">{post.readTime} read</span>
            </div>
            <h2 className="font-heading font-semibold text-[#f0f0ff] mb-2 group-hover:text-[#4ade80] transition-colors line-clamp-2">
              {post.title}
            </h2>
            <p className="text-xs text-[#8888aa] line-clamp-3 mb-4">{post.excerpt}</p>
            <p className="text-xs text-[#3a3a5c]">{post.date}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
