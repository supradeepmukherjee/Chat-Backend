import mongoose, { model, Schema, Types } from 'mongoose'

const schema = new Schema({
    content: String,
    sender: {
        type: Types.ObjectId,
        ref: 'ChatUser',
        required: true,
    },
    chat: {
        type: Types.ObjectId,
        ref: 'Chat',
        required: true,
    },
    attachments: [{
        publicID: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        },
    }],
},
    { timestamps: true }
)

export const Msg = mongoose.models.Msg || model('Msg', schema)