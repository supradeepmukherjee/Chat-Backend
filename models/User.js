import { hash } from 'bcrypt'
import mongoose, { model, Schema, Types } from 'mongoose'

const schema = new Schema({
    name: {
        type: String,
        required: true,
    },
    uName: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        select: false,
        minLength: 8
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    about: {
        type: String,
        required: true,
    },
    chavi: {
        publicID: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        },
    },
    lastOnline: Date,
    online: Boolean,
    unread: [{
        chat: {
            type: Types.ObjectId,
            ref: 'Chat'
        },
        qty: Number
    }],
    resetPasswordToken: String,
    resetPasswordExpiry: Date,
},
    { timestamps: true }
)

schema.pre('save', async function (next) {
    if (!this.isModified('password')) return next()
    this.password = await hash(this.password, 10)
})

export const User = mongoose.models.ChatUser || model('ChatUser', schema)