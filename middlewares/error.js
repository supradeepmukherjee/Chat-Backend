import { envMode } from "../app.js"

const errorMiddleware = async (err, req, res, next) => {
    err.message ||= 'Internal Server Error'
    err.status ||= 500
    if (err.code === 11000) {
        err.message = `Duplicate Field(s) - ${Object.keys(err.keyPattern).join(', ')}`
        err.status = 400
    }
    if (err.name === 'CastError') {
        err.message = `Invalid format of ${err.path}`
        err.status = 400
    }
    const response = {
        success: false,
        msg: err.message
    }
    if (envMode === 'DEVELOPMENT') response.error = err
    return res.status(err.status).json(response)
}

const tryCatch = f => async (req, res, next) => {
    try {
        await f(req, res, next)
    } catch (err) {
        console.log(err)
        next(err)
    }
}

export { errorMiddleware, tryCatch }