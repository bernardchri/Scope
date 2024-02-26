import GithubProvider from "next-auth/providers/github"
import { env } from "./env"
import { AuthOptions, getServerSession } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "./prisma"
import { Prisma } from '@prisma/client';

export const authOptions: AuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GithubProvider({
            clientId: env.GITHUB_ID,
            clientSecret: env.GITHUB_SECRET,
            profile(profile) {
                console.log({ profile })
                return {
                    id: profile.id.toString(),
                    username: profile.login,
                    name: profile.name,
                    email: profile.email,
                    image: profile.avatar_url,
                    bio: profile.bio, 
                    link : profile.blog,
                } satisfies Prisma.UserCreateInput
            }
        }),
    ],
    callbacks: {
        session({ session, user }) {
            if (!session?.user) return session;
            session.user.id = user.id;
            return session;
        }
    }
}


export const getAuthSession = async () => {
    const session = await getServerSession(authOptions);
    return session
}