import { User } from "../models/User.js"
import { Chat } from "../models/Chat.js"
import { faker, simpleFaker } from '@faker-js/faker'

const createSingleChats = async () => {
    try {
        const users = await User.find().select('_id')
        const chatsPromise = []
        for (let i = 0; i < users.length; i++) {
            for (let j = i + 1; j < users.length; j++) {
                chatsPromise.push(Chat.create({
                    name: faker.lorem.words(2),
                    members: [users[i], users[j]]
                }))
            }
        }
        await Promise.all(chatsPromise)
        console.log('single chats created')
    } catch (err) {
        console.log(err)
    }
}

const createGroupChats = async n => {
    try {
        const users = await User.find().select('_id')
        const chatsPromise = []
        for (let i = 0; i < n; i++) {
            const numMembers = simpleFaker.number.int({ min: 3, max: users.length })
            const members = []
            for (let j = 0; j < numMembers; j++) {
                const randomIndex = Math.floor(Math.random() * users.length)
                const randomUser = users[randomIndex]
                if (!members.includes(randomUser)) members.push(randomUser)
            }
            chatsPromise.push(Chat.create({
                name: faker.lorem.words(1),
                members,
                creator: members[0],
                grpChat: true,
            }))
        }
        await Promise.all(chatsPromise)
        console.log('group chats created')
    } catch (err) {
        console.log(err)
    }
}

export { createSingleChats, createGroupChats }