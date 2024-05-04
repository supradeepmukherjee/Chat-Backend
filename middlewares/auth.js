import jwt from 'jsonwebtoken'
import { ErrorHandler } from "../utils/utility.js"
import { adminKey } from '../app.js'
import { User } from '../models/User.js'

const isAuthenticated = (req, res, next) => {
    const { user } = req.cookies
    if (!user) return next(new ErrorHandler(401, 'Please Login first'))
    const { _id } = jwt.verify(user, process.env.JWT_SECRET)
    req.user = _id
    next()
}

const isAdmin = (req, res, next) => {
    const { admin } = req.cookies
    if (!admin) return next(new ErrorHandler(401, 'Unauthorised. Please Login first'))
    const key = jwt.verify(admin, process.env.JWT_SECRET)
    const matched = key === adminKey
    if (!matched) return next(new ErrorHandler(401, 'Unauthorised. Please Login first'))
    next()
}

const socketAuthenticator = async (err, socket, next) => {
    try {
        if (err) return next(err)
        const token = socket.request.cookies.user
        if (!token) return next(new ErrorHandler(401, 'Please Login First'))
        const { _id } = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(_id)
        if (!user) return next(new ErrorHandler(404, 'User is not Registered'))
        socket.user = user
        return next()
    } catch (err) {
        console.log(err)
        next(new ErrorHandler(401, 'Please Login First'))
    }
}

export { isAuthenticated, isAdmin, socketAuthenticator }