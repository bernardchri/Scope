import { Prisma, PrismaClient } from '@prisma/client';
import { faker } from "@faker-js/faker"

const prisma = new PrismaClient();

const main = async () => {
    const users = [];
    for (let i = 0; i < 10; i++) {
        const user = {
            username: faker.internet.userName(),
            image: faker.image.avatar(),
            name: faker.person.firstName(),
            bio: faker.lorem.paragraph(),
            link: faker.internet.url(),
            email: faker.internet.email()
        } satisfies Prisma.UserCreateInput;

        const dbUser = await prisma.user.create({ data: user })
        users.push(dbUser)
    }

    const pages = [];
    for (let i = 0; i < 10; i++) {
    const page  = {
        name : "ma nouvelle page",
        id : crypto.randomUUID()
    } satisfies Prisma.PageCreateInput


    const dbPage = await prisma.page.create({ data: page })
    pages.push(dbPage)
}


}
main()