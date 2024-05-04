import mongoose, { model, Schema, Types } from 'mongoose'

const schema = new Schema({
    status: {
        type: String,
        default: 'Pending',
        enum: ['Pending', 'Accepted', 'Rejected'],
    },
    sender: {
        type: Types.ObjectId,
        ref: 'ChatUser',
        required: true,
    },
    receiver: {
        type: Types.ObjectId,
        ref: 'ChatUser',
        required: true,
    },
},
    { timestamps: true }
)

export const Request = mongoose.models.Request || model('Request', schema)