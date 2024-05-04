import { Router } from 'express'
import { getChats, getDashboardStats, getMsgs, getUsers, login, logOut } from '../controllers/admin.js'
import { adminLoginValidator, validateHandler } from '../lib/validators.js'
import { isAdmin } from '../middlewares/auth.js'

const app = Router()

app.put('/login', adminLoginValidator(), validateHandler, login)

app.use(isAdmin)
app.get('/', getDashboardStats)
app.get('/logout', logOut)
app.get('/users', getUsers)
app.get('/chats', getChats)
app.get('/msgs', getMsgs)

export default app