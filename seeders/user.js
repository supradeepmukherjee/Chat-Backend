import { User } from "../models/User.js"
import { faker } from '@faker-js/faker'

const createUser = async n => {
    try {
        const usersPromise = []
        for (let i = 0; i < n; i++) {
            usersPromise.push(User.create({
                name: faker.person.fullName(),
                uName: faker.internet.userName(),
                bio: faker.lorem.sentence(),
                password: 'password',
                chavi: {
                    url: faker.image.avatar(),
                    publicID: faker.system.fileName()
                }
            }))
        }
        await Promise.all(usersPromise)
        console.log('users created')
    } catch (err) {
        console.log(error)
    }
}

export { createUser }