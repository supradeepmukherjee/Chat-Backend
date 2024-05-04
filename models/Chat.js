import mongoose, { model, Schema, Types } from 'mongoose'

const schema = new Schema({
    name: {
        type: String,
        required: true,
    },
    grpChat: {
        type: Boolean,
        default: false,
    },
    admin: [{
        type: Types.ObjectId,
        ref: 'ChatUser'
    }],
    members: [{
        type: Types.ObjectId,
        ref: 'ChatUser',
        max: 100
    }],
    chavi: {
        publicID: String,
        url: String,
    },
},
    { timestamps: true }
)

export const Chat = mongoose.models.Chat || model('Chat', schema)