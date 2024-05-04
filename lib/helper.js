import { userSocketIDs } from "../app.js"

export const findOtherPerson = (members, id) => members.find(m => m._id.toString() !== id.toString())

export const getSockets = (users = []) => users.map(u => userSocketIDs.get(u.toString()))

export const getBase64 = f => `data:${f.mimetype};base64,${f.buffer.toString('base64')}`