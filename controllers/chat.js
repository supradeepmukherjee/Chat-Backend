import { alert, new_msg, new_msg_alert, refetch_chats } from "../constants/events.js"
import { findOtherPerson } from "../lib/helper.js"
import { tryCatch } from "../middlewares/error.js"
import { Chat } from '../models/Chat.js'
import { Msg } from '../models/Msg.js'
import { User } from '../models/User.js'
import { delCloudinaryFiles, emitEvent, uploadToCloudinary } from "../utils/features.js"
import { ErrorHandler } from "../utils/utility.js"

const newGrpChat = tryCatch(async (req, res, next) => {
    const { name, members } = req.body
    const file = req.file
    const parsedMembers = JSON.parse(members)
    if (parsedMembers.length < 2) return next(new ErrorHandler(400, 'A group must have atleast 2 members'))
    if (parsedMembers.length > 99) return next(new ErrorHandler(400, 'A group cannot have more than 100 members'))
    if (!file) return next(new ErrorHandler(400, 'Please upload File Chavi'))
    const allMembers = [...parsedMembers, req.user]
    const chaviResult = await uploadToCloudinary([file])
    const chavi = {
        publicID: chaviResult[0].publicID,
        url: chaviResult[0].url,
    }
    const chat = await Chat.create({
        name,
        grpChat: true,
        members: allMembers,
        admin: [req.user],
        chavi
    })
    emitEvent(req, alert, parsedMembers, `Welcome to ${name} Group`)
    emitEvent(req, refetch_chats, parsedMembers)
    res.status(201).json({ success: true, msg: 'Group Created', chat })
})

const getMyChats = tryCatch(async (req, res, next) => {
    const chats = await Chat.find({ members: req.user }).populate('members', 'name chavi uName about createdAt')
    const transformedChats = chats.reverse().map(({ _id, name, members, grpChat, chavi, createdAt }) => {
        const otherPerson = findOtherPerson(members, req.user)
        return {
            _id,
            grpChat,
            name: grpChat ? name : otherPerson.name,
            about: grpChat ? '' : otherPerson.about,
            uName: grpChat ? '' : otherPerson.uName,
            createdAt: grpChat ? createdAt : otherPerson.createdAt,
            members: members.reduce((prev, curr) => {
                if (curr._id.toString() !== req.user.toString()) prev.push(curr._id)
                return prev
            }, []),
            chavi: grpChat ?
                chavi.url
                :
                otherPerson.chavi.url
        }
    })
    res.status(200).json({ success: true, chats: transformedChats })
})

const getMyGrps = tryCatch(async (req, res, next) => {
    const chats = await Chat.find({
        members: req.user,
        grpChat: true
    }).populate('members', 'name chavi')
    const grps = chats.map(({ members, _id, grpChat, name, chavi }) => ({
        _id,
        grpChat,
        name,
        chavi: chavi.url
    }))
    res.status(200).json({ success: true, grps })
})

const addMembers = tryCatch(async (req, res, next) => {
    const { id, members } = req.body
    const chat = await Chat.findById(id)
    if (!chat) return next(new ErrorHandler(404, 'Chat Not Found'))
    if (!chat.grpChat) return next(new ErrorHandler(400, 'Not a Group Chat'))
    if (!chat.admin.includes(req.user)) return next(new ErrorHandler(403, 'You are not allowed to Add Members'))
    const allNewMembersPromise = members.map(m => User.findById(m, 'name'))
    const allNewMembers = await Promise.all(allNewMembersPromise)
    const uniqueMembers = allNewMembers.filter(m =>
        !chat.members.includes(m._id.toString())
    ).map(m => m._id)
    chat.members.push(...uniqueMembers)
    if (chat.members.length > 100) return next(new ErrorHandler(400, 'There can\'t be more than 100 members'))
    await chat.save()
    const allUsersName = allNewMembers.map(m => m.name).join(',')
    emitEvent(
        req,
        alert,
        chat.members,
        `${allUsersName} ${allUsersName.length > 1 ? 'have' : 'has'} been added to ${chat.name} group`)
    emitEvent(req, refetch_chats, chat.members)
    res.status(200).json({ success: true, msg: 'Members Added Successfully' })
})

const removeMember = tryCatch(async (req, res, next) => {
    const { chatID, userID } = req.body
    const [chat, user] = await Promise.all([Chat.findById(chatID), User.findById(userID, 'name')])
    if (!chat) return next(new ErrorHandler(404, 'Chat Not Found'))
    if (!chat.grpChat) return next(new ErrorHandler(400, 'Not a Group Chat'))
    if (!chat.admin.includes(req.user)) return next(new ErrorHandler(403, 'You are not allowed to remove Members'))
    if (chat.members.length < 4) return next(new ErrorHandler(400, 'Group must have atleast 3 members'))
    const origChatMembers = chat.members.map(({ _id }) => _id.toString())
    chat.members = chat.members.filter(m => m.toString() !== userID.toString())
    await chat.save()
    emitEvent(
        req,
        alert,
        chat.members,
        {
            msg: `${user.name} has been removed from the group`,
            chatID
        }
    )
    emitEvent(req, refetch_chats, origChatMembers)
    res.status(200).json({ success: true, msg: 'Removed Successfully' })
})

const leaveGroup = tryCatch(async (req, res, next) => {
    const { id } = req.params
    const chat = await Chat.findById(id)
    if (!chat) return next(new ErrorHandler(404, 'Chat Not Found'))
    if (!chat.grpChat) return next(new ErrorHandler(400, 'Not a Group Chat'))
    if (!chat.members.includes(req.user)) return next(new ErrorHandler(400, 'Person not present in group'))
    if (chat.members.length < 4) return next(new ErrorHandler(400, 'Group must have atleast 3 members'))
    const filterMe = chat.members.filter(m => m.toString() !== req.user.toString())
    if (chat.admin.includes(req.user) && chat.admin.length === 1) return next(new ErrorHandler(400, 'Please assign a new Admin before leaving the Group'))
    chat.members = filterMe
    const [user] = await Promise.all([User.findById(req.user, 'name'), chat.save()])
    emitEvent(
        req,
        alert,
        chat.members,
        {
            msg: `${user.name} has left the group`,
            chatID: id
        }
    )
    res.status(200).json({ success: true, msg: 'Left Group' })
})

const sendAttachments = tryCatch(async (req, res, next) => {
    const { id } = req.body
    const files = req.files || []
    if (files.length < 1) return next(new ErrorHandler(400, 'Please provide attachments'))
    if (files.length > 5) return next(new ErrorHandler(400, 'Max. 5 files can be sent at a time'))
    const [chat, user] = await Promise.all([Chat.findById(id), User.findById(req.user)])
    if (!chat) return next(new ErrorHandler(404, 'Chat Not Found'))
    let nonEmptyFiles = []
    files.forEach(f => {
        if (f.size > 0) nonEmptyFiles.push(f)
    })
    if (nonEmptyFiles.length < 1) return res.status(400).json({ success: false, msg: 'Empty files cannot be sent' })
    const attachments = await uploadToCloudinary(nonEmptyFiles)
    const dbMsg = {
        attachments,
        sender: req.user,
        chat: id
    }
    const realTimeMsg = {
        ...dbMsg,
        sender: {
            id: req.user,
            name: user.name,
            chavi: user.chavi.url
        }
    }
    const msg = await Msg.create(dbMsg)
    emitEvent(req, new_msg, chat.members, { msg: realTimeMsg, id })
    emitEvent(req, new_msg_alert, chat.members, { id })
    res.status(200).json({ success: true, msg })
})

const getGroupDetails = tryCatch(async (req, res, next) => {
    const { id } = req.params
    if (req.query.populate === '1') {
        const chat = await Chat.findById(id).populate('members', 'name chavi').lean()
        if (!chat) return next(new ErrorHandler(404, 'Chat Not Found'))
        chat.members = chat.members.map(({ _id, name, chavi }) => ({
            _id,
            name,
            chavi: chavi.url
        }))
        res.status(200).json({ success: true, chat })
    } else {
        const chat = await Chat.findById(id)
        if (!chat) return next(new ErrorHandler(404, 'Chat Not Found'))
        res.status(200).json({ success: true, chat })
    }
})

const renameGrp = tryCatch(async (req, res, next) => {
    const chat = await Chat.findById(req.params.id)
    if (!chat) return next(new ErrorHandler(404, 'Chat Not Found'))
    if (!chat.grpChat) return next(new ErrorHandler(400, 'Not a Group Chat'))
    if (!chat.admin.includes(req.user)) return next(new ErrorHandler(403, 'You are not allowed to change group name'))
    chat.name = req.body.name
    await chat.save()
    emitEvent(req, refetch_chats, chat.members)
    res.status(200).json({ success: true, msg: 'Group Renamed Successfully', chat })
})

const delGroup = tryCatch(async (req, res, next) => {
    const { id } = req.params
    const chat = await Chat.findById(id)
    if (!chat) return next(new ErrorHandler(404, 'Chat Not Found'))
    if (chat.grpChat && (!chat.admin.includes(req.user))) return next(new ErrorHandler(403, 'You are not allowed to delete this group'))
    if (!chat.grpChat && !chat.members.includes(req.user.toString())) return next(new ErrorHandler(403, 'You are not allowed to delete this chat'))
    for (let i = 0; i < chat.members.length; i++) {
        const user = await User.findById(chat.members[i]).select('unread')
        const index = user.unread.findIndex(({ chat }) => chat.toString() === id)
        if (index !== -1) {
            const filtered = user.unread.filter(({ chat }) => chat.toString() !== id.toString())
            user.unread = filtered
            await user.save()
        }
    }
    const msgsWithAttachments = await Msg.find({
        chat: id,
        attachments: {
            $exists: true,
            $ne: []
        }
    })
    const publicIDs = []
    msgsWithAttachments.forEach(({ attachments }) => {
        attachments.forEach(a => publicIDs.push(a.publicID))
    })
    await Promise.all([
        delCloudinaryFiles(publicIDs),
        Chat.deleteOne(chat),
        Msg.deleteMany({ chat: id })
    ])
    emitEvent(req, refetch_chats, chat.members)
    res.status(200).json({ success: true, msg: 'Chat Deleted Successfully' })
})

const getMsgs = tryCatch(async (req, res, next) => {
    const { id } = req.params
    const { page } = req.query
    const chat = await Chat.findById(id)
    if (!chat) return next(new ErrorHandler(404, 'No Messages found as chat doesn\'t exist'))
    if (!chat.members.includes(req.user.toString())) return next(new ErrorHandler(403, 'You are not allowed to access this chat'))
    const limit = 20
    const [totalMsgs, msgs] = await Promise.all([
        Msg.countDocuments({ chat: id }),
        Msg
            .find({ chat: id })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('sender', 'name chavi')
            .lean()
    ])
    const totalPages = Math.ceil(totalMsgs / limit)
    res.status(200).json({ success: true, msgs, totalPages })
})

const toggleAdmin = tryCatch(async (req, res, next) => {
    const { chatID, userID, make } = req.body
    const chat = await Chat.findById(chatID)
    if (!chat) return next(new ErrorHandler(404, 'Chat Not Found'))
    if (!chat.grpChat) return next(new ErrorHandler(400, 'Not a Group Chat'))
    if (!chat.admin.includes(req.user)) return next(new ErrorHandler(403, 'You are not allowed to remove Members'))
    if (make) chat.admin.push(userID)
    else {
        if (chat.admin.length === 1) return next(new ErrorHandler(400, 'A group must have atleast 1 admin'))
        const afterRemoved = chat.admin.filter(a => a.toString() !== userID)
        chat.admin = afterRemoved
    }
    await chat.save()
    res.status(200).json({ success: true, msg: make ? 'Assigned Admin Rights' : 'Revoked Admin Rights' })
})

const delMsg = tryCatch(async (req, res, next) => {
    const msg = await Msg.findById(req.params.id)
    if (!msg) return next(new ErrorHandler(404, 'Message Not Found'))
    const publicIDs = []
    if (msg.attachments.length > 0) msg.attachments.forEach(({ publicID }) => {
        publicIDs.push(publicID)
    })
    await Promise.all([
        delCloudinaryFiles(publicIDs),
        Msg.deleteOne(msg),
    ])
    res.status(200).json({ success: true, msg: 'Message Deleted' })
})

export { newGrpChat, getMyChats, getMyGrps, addMembers, removeMember, leaveGroup, sendAttachments, getGroupDetails, renameGrp, delGroup, getMsgs, toggleAdmin, delMsg }