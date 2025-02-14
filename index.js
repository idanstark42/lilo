require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { MongoClient } = require('mongodb')
const { Client: StytchClient } = require('stytch')
const fileupload = require('express-fileupload')
const cloudinary = require('cloudinary').v2

const app = express()
const PORT = process.env.PORT || 5000

const LOG_LEVELS = ['debug', 'info', 'warn', 'error']
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'
const log = (logLevel, ...str) => {
  if (LOG_LEVELS.indexOf(LOG_LEVEL) > LOG_LEVELS.indexOf(logLevel)) {
    return
  }
  console.log(`[${new Date().toISOString()}]`, ...str)
}
LOG_LEVELS.forEach(logLevel => {
  log[logLevel] = (...str) => log(logLevel, ...str)
})

// MongoDB client setup
const mongoClient = new MongoClient(process.env.MONGO_URI)

// Stytch client setup
const stytch = new StytchClient({
  project_id: process.env.STYTCH_PROJECT_ID,
  secret: process.env.STYTCH_SECRET
})

// Use CORS middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Middleware to parse JSON
app.use(express.json())

// Middleware to parse file uploads
app.use(fileupload({ useTempFiles: true }))

// Helper to verify authentication
async function handleAuth(authLevel, headerAuth) {
  if (authLevel === 'none') return null
  if (!headerAuth) throw { status: 401, message: 'Missing Authorization header' }
  
  const [type, session_token] = headerAuth.split(' ')
  if (!session_token) throw { status: 400, message: 'Invalid Authorization format' }

  try {
    const response = await stytch.sessions.authenticate({ session_token })
    const userId = response.session.user_id
    if (authLevel === 'personal' && !Boolean(userId)) throw { status: 401, message: 'Authentication failed' }
    return userId
  } catch (err) {
    throw { status: 401, message: 'Authentication failed' }
  }
}

// Helper to add auth restrictions to database queries
function filterWithAuth(filter, authLevel, userId) {
  if (authLevel === 'personal') {
    if (!filter) throw { status: 400, message: 'Filter is required for personal read' }
    filter.owner_id = userId
  }
  return filter
}

// action handlers
const actionHandlers = {
  create: async function handleCreate(dbCollection, { authLevel, userId, data, options }) {
    if (authLevel === 'personal') {
      data.owner_id = userId
    }
    return await dbCollection.insertOne(data, options)
  },
  read: async function handleRead(dbCollection, { authLevel, userId, filter, options }) {
    const fields = options.fields || {}
    delete options.fields
    return await dbCollection.find(filterWithAuth(filter, authLevel, userId) || {}, fields, options).toArray()
  },
  update: async function handleUpdate(dbCollection, { authLevel, userId, filter, data, options }) {
    const result = await dbCollection.updateOne(filterWithAuth(filter, authLevel, userId), { $set: data }, options)
    if (result.matchedCount === 0) throw { status: 404, message: 'No matching document found for update' }
    return result
  },
  delete: async function handleDelete(dbCollection, { authLevel, userId, filter, options }) {
    const result = await dbCollection.deleteOne(filterWithAuth(filter, authLevel, userId), options)
    if (result.deletedCount === 0) throw { status: 404, message: 'No matching document found for deletion' }
    return result
  }  
}

// Unified endpoint for database operations
app.post('/database', async (req, res) => {
  const { action, collection, data, filter, options } = req.body
  const authLevel = process.env[`${action.toUpperCase()}_AUTH_LEVEL`]
  log.info(`${action} (authLevel=${authLevel}) from ${collection} ${JSON.stringify(data)} ${JSON.stringify(filter)}`)

  if (!authLevel || !actionHandlers[action]) {
    return res.status(400).json({
      success: false,
      error: `Invalid action or missing ${action.toUpperCase()}_AUTH_LEVEL environment variable`
    })
  }

  try {
    const userId = await handleAuth(authLevel, req.headers.authorization)
    const db = mongoClient.db()
    const dbCollection = db.collection(collection)

    const handler = actionHandlers[action]
    log.debug(`userId=${userId}`)
    const result = await handler(dbCollection, { authLevel, userId, data, filter, options })

    res.status(200).json({ success: true, result })
  } catch (err) {
    const status = err.status || 500
    log.error(err)
    res.status(status).json({ success: false, error: err.message || 'Internal Server Error' })
  }
})

// Cloudinary endpoint for image uploads
app.post('/image', async (req, res) => {
  const image = req.files?.image?.tempFilePath
  const authLevel = process.env.IMAGE_AUTH_LEVEL
  log.info(`Upload image (authLevel=${authLevel})`)

  try {
    await handleAuth(authLevel, req.headers.authorization)
    const result = await cloudinary.uploader.upload(image, {
      folder: 'lilo',
      public_id: `${new Date().toISOString().replace(/[^0-9]/g, '')}`,
      resource_type: 'auto'
    })
    res.status(200).json({ success: true, result })
  } catch (err) {
    log.error(err)
    res.status(500).json({ success: false, error: err.message || 'Internal Server Error' })
  }
})

// Connect to MongoDB and start the server
;(async () => {
  try {
    await mongoClient.connect()
    log.debug('Connected to MongoDB Atlas')
  } catch (err) {
    log.error('Error connecting to MongoDB:', err)
    process.exit(1)
  }
  app.listen(PORT, () => {
    log.info(`Server is running on ${PORT}`)
    log.debug('---------------------------------')
    log.debug(`Stytch project ID: ${process.env.STYTCH_PROJECT_ID}`)
    log.debug(`CREATE_AUTH_LEVEL: ${process.env.CREATE_AUTH_LEVEL}`)
    log.debug(`READ_AUTH_LEVEL: ${process.env.READ_AUTH_LEVEL}`)
    log.debug(`UPDATE_AUTH_LEVEL: ${process.env.UPDATE_AUTH_LEVEL}`)
    log.debug(`DELETE_AUTH_LEVEL: ${process.env.DELETE_AUTH_LEVEL}`)
  })
})()
