import { User } from "../models/User.js"
import { Chat } from "../models/Chat.js"
import { Msg } from "../models/Msg.js"
import { faker } from '@faker-js/faker'

const createMsgs = async n => {
    try {
        const users = await User.find().select('_id')
        const chats = await Chat.find().select('_id')
        const msgsPromise = []
        for (let i = 0; i < n; i++) {
            const randomUser = users[Math.floor(Math.random() * users.length)]
            const randomChat = chats[Math.floor(Math.random() * chats.length)]
            msgsPromise.push(Msg.create({
                chat: randomChat,
                sender: randomUser,
                content: faker.lorem.sentence()
            }))
        }
        await Promise.all(msgsPromise)
        console.log('msgs created')
    } catch (err) {
        console.log(err)
    }
}

const createMsgsInChat = async (chat, n) => {
    try {
        const users = await User.find().select('_id')
        const msgsPromise = []
        for (let i = 0; i < n; i++) {
            const randomUser = users[Math.floor(Math.random() * users.length)]
            msgsPromise.push(Msg.create({
                chat,
                sender: randomUser,
                content: faker.lorem.sentence()
            }))
        }
        await Promise.all(msgsPromise)
        console.log('msgs in chat created')
    } catch (err) {
        console.log(err)
    }
}

export { createMsgs, createMsgsInChat }