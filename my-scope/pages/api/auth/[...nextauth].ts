import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth/next";
// import { PrismaClient } from "@prisma/client"


// const prisma = new PrismaClient()

export default NextAuth(authOptions)