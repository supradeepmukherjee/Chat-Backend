import jwt from 'jsonwebtoken'
import { connect } from "mongoose"
import { v2 } from 'cloudinary'
import { v4 as randomId } from 'uuid'
import { getBase64, getSockets } from '../lib/helper.js'
import mailer from 'nodemailer'

const cookieOptions = {
    maxAge: 60 * 60 * 24 * 15000,
    sameSite: 'none',
    httpOnly: true,
    secure: true
}

const connectDB = async uri => {
    try {
        await connect(uri)
        console.log('Connected to DB')
    } catch (err) {
        console.log(err)
    }
}

const sendToken = async (res, user, code, msg) => {
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET)
    return res
        .status(code)
        .cookie('user', token, cookieOptions)
        .json({ success: true, msg, user })
}

const emitEvent = (req, e, users, data) => {
    const io = req.app.get('io')
    const usersSocket = getSockets(users)
    io.to(usersSocket).emit(e, data)
}

const uploadToCloudinary = async files => {
    const uploadPromises = files.map(f =>
        new Promise((resolve, reject) => {
            v2.uploader.upload(getBase64(f), {
                resource_type: 'auto',
                folder: 'Chat_Chavi',
                public_id: randomId()
            }, (err, result) => {
                if (err) return reject(err)
                resolve(result)
            })
        })
    )
    try {
        const rawResults = await Promise.all(uploadPromises)
        const results = rawResults.map(r => ({
            publicID: r.public_id,
            url: r.secure_url
        }))
        return results
    } catch (err) {
        console.log(err)
        throw new Error('Error uploading files to cloudinary', err)
    }
}

const delCloudinaryFiles = async files => {
    const delPromises = files.map(f =>
        new Promise((resolve, reject) => {
            v2.uploader.destroy(f, (err, result) => {
                if (err) return reject(err)
                resolve(result)
            })
        })
    )
    try {
        await Promise.all(delPromises)
    } catch (err) {
        console.log(err)
        throw new Error('Error deleting files in cloudinary', err)
    }
}

const sendEmail = async ({ to, subject, text }) => {
    const transporter = mailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    })
    const mailOptions = { from: process.env.SMTP_MAIL, to, text, subject }
    await transporter.sendMail(mailOptions)
}

export { connectDB, sendToken, cookieOptions, emitEvent, uploadToCloudinary, delCloudinaryFiles, sendEmail }