import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Resend from 'next-auth/providers/resend'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from './db'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/auth/login',
    verifyRequest: '/auth/magic-link',
    error: '/auth/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        })

        if (!user?.password) return null
        if (user.isSuspended) return null

        const valid = await bcrypt.compare(parsed.data.password, user.password)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
          plan: user.plan,
          isAdmin: user.isAdmin,
        }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY!,
      from: process.env.EMAIL_FROM ?? 'noreply@vaultrix.io',
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.plan = (user as { plan?: string }).plan ?? 'FREE'
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false
      }
      if (trigger === 'update' && session?.plan) {
        token.plan = session.plan
      }
      // Always refresh from DB on sign in
      if (trigger === 'signIn' && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { plan: true, isAdmin: true, isSuspended: true },
        })
        if (dbUser) {
          token.plan = dbUser.plan
          token.isAdmin = dbUser.isAdmin
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { plan?: string }).plan = token.plan as string
        ;(session.user as { isAdmin?: boolean }).isAdmin = token.isAdmin as boolean
      }
      return session
    },
    async signIn({ user, account }) {
      if (account?.provider !== 'credentials') {
        // Ensure DB user exists for OAuth
        const dbUser = await db.user.findUnique({
          where: { email: user.email! },
          select: { isSuspended: true },
        })
        if (dbUser?.isSuspended) return false
      }
      return true
    },
  },
  events: {
    async createUser({ user }) {
      // Send welcome email
      try {
        const { sendWelcomeEmail } = await import('./email')
        await sendWelcomeEmail(user.email!, user.name ?? 'there')
      } catch {
        // non-fatal
      }
    },
  },
})

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      plan: string
      isAdmin: boolean
    }
  }
}
