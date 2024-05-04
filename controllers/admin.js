import jwt from "jsonwebtoken"
import { adminKey } from '../app.js'
import { tryCatch } from "../middlewares/error.js"
import { Chat } from '../models/Chat.js'
import { Msg } from '../models/Msg.js'
import { User } from '../models/User.js'
import { cookieOptions } from '../utils/features.js'
import { ErrorHandler } from "../utils/utility.js"

const login = tryCatch(async (req, res, next) => {
    const { key } = req.body
    const matched = key === adminKey
    if (!matched) return next(new ErrorHandler(401, 'Invalid Key'))
    const token = jwt.sign(adminKey, process.env.JWT_SECRET)
    res.status(200)
        .cookie('admin', token, { ...cookieOptions, maxAge: 1000 * 60 * 30 })
        .json({ success: true, msg: 'Welcome Admin!' })
})

const getUsers = tryCatch(async (req, res) => {
    console.log('get users')
    const rawUsers = await User.find()
        .populate('name chavi')
        .populate('name chavi')
    const users = await Promise.all(rawUsers.map(async ({ name, uName, chavi, _id }) => {
        const [grps, friends] = await Promise.all([
            Chat.countDocuments({
                grpChat: true,
                members: _id
            }),
            Chat.countDocuments({
                grpChat: false,
                members: _id
            }),
        ])
        return {
            name,
            uName,
            chavi: chavi.url,
            _id,
            grps,
            friends
        }
    }))
    res.status(200).json({ success: true, users })
})

const getChats = tryCatch(async (req, res) => {
    const rawChats = await Chat.find().populate('members admin')
    const chats = await Promise.all(rawChats.map(async ({ name, grpChat, _id, members, admin, chavi }) => {
        const totalMsgs = await Msg.countDocuments({ chat: _id })
        return {
            _id,
            name,
            grpChat: grpChat ? 'Yes' : 'No',
            totalMsgs,
            chavi: grpChat ? chavi.url : members.map(({ chavi }) => chavi.url),
            totalMembers: members.length,
            members: members.map(({ _id, name, chavi }) => ({
                _id,
                name,
                chavi: chavi.url
            })),
            admin: admin?.map(({ name, chavi }) => ({
                name: name || 'None',
                chavi: chavi.url || null
            })),
        }
    }))
    res.status(200).json({ success: true, chats })
})

const getMsgs = tryCatch(async (req, res) => {
    const rawMsgs = await Msg.find()
        .populate('sender', 'name chavi')
        .populate('chat', 'grpChat')
    const msgs = rawMsgs.map(({ content, attachments, _id, sender, createdAt, chat }) => ({
        _id,
        attachments,
        content,
        createdAt,
        chat: chat._id,
        grpChat: chat.grpChat ? 'Yes' : 'No',
        sender: {
            _id: sender._id,
            name: sender.name,
            chavi: sender.chavi.url
        }
    }))
    res.status(200).json({ success: true, msgs })
})

const getDashboardStats = tryCatch(async (req, res) => {
    const [userCount, chatCount, grpCount, msgCount] = await Promise.all([
        User.countDocuments(),
        Chat.countDocuments(),
        Chat.countDocuments({ grpChat: true }),
        Msg.countDocuments(),
    ])
    const today = new Date()
    const last7Days = new Date()
    last7Days.setDate(last7Days.getDate() - 7)
    const last7DaysMsgs = await Msg.find({ createdAt: { $gte: last7Days } }).select('createdAt')
    const msgs = new Array(7).fill(0)
    last7DaysMsgs.forEach(m => {
        const index = Math.floor((today.getTime() - m.createdAt.getTime()) / (1000 * 3600 * 24))
        msgs[6 - index]++
    });
    res.status(200).json({ success: true, userCount, chatCount, grpCount, msgCount, msgs })
})

const logOut = tryCatch(async (req, res) => {
    res.status(200).cookie('admin', null, { ...cookieOptions, maxAge: 0 }).json({ success: true, msg: 'Logged Out Successfully' })
})

export { login, getUsers, getChats, getMsgs, getDashboardStats, logOut }