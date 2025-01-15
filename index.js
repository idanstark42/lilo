require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { MongoClient } = require('mongodb')
const { Client: StytchClient } = require('stytch')

const app = express()
const PORT = process.env.PORT || 5000

// MongoDB client setup
const mongoClient = new MongoClient(process.env.MONGO_URI)

// Stytch client setup
const stytch = new StytchClient({
  project_id: process.env.STYTCH_PROJECT_ID,
  secret: process.env.STYTCH_SECRET
})

// Use CORS middleware
app.use(cors({
  origin: '*',  // Allow only your React app
  methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow headers
}))

// Middleware to parse JSON
app.use(express.json())

// Helper to verify authentication
async function handleAuth(authLevel, headerAuth) {
  if (authLevel === 'none') return null
  if (!headerAuth) throw { status: 401, message: 'Missing Authorization header' }
  
  console.log('headerAuth')
  console.log(headerAuth)
  const [type, session_token] = headerAuth.split(' ')
  if (!token) throw { status: 400, message: 'Invalid Authorization format' }

  try {
    console.log('token')
    console.log(token)
    const response = await stytch.sessions.authenticate({ session_token })
    const userId = response.user_id
    console.log('userId')
    console.log(userId)
    if (authLevel === 'personal' && !Boolean(userId)) throw { status: 401, message: 'Authentication failed' }
    return userId
  } catch (err) {
    console.log('Error authenticating with Stytch:', err)
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
  create: async function handleCreate(dbCollection, { authLevel, userId, data }) {
    if (authLevel === 'personal') {
      data.owner_id = userId
    }
    return await dbCollection.insertOne(data)
  },
  read: async function handleRead(dbCollection, { authLevel, userId, filter }) {
    return await dbCollection.find(filterWithAuth(filter, authLevel, userId) || {}).toArray()
  },
  update: async function handleUpdate(dbCollection, { authLevel, userId, filter, data }) {
    const result = await dbCollection.updateOne(filterWithAuth(filter, authLevel, userId), { $set: data })
    if (result.matchedCount === 0) throw { status: 404, message: 'No matching document found for update' }
    return result
  },
  delete: async function handleDelete(dbCollection, { authLevel, userId, filter }) {
    const result = await dbCollection.deleteOne(filterWithAuth(filter, authLevel, userId))
    if (result.deletedCount === 0) throw { status: 404, message: 'No matching document found for deletion' }
    return result
  }  
}

// Unified endpoint for database operations
app.post('/', async (req, res) => {
  const { action, collection, data, filter } = req.body
  const authLevel = process.env[`${action.toUpperCase()}_AUTH_LEVEL`]

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
    const result = await handler(dbCollection, { authLevel, userId, data, filter })

    res.status(200).json({ success: true, result })
  } catch (err) {
    const status = err.status || 500
    res.status(status).json({ success: false, error: err.message || 'Internal Server Error' })
  }
})

// Connect to MongoDB and start the server
;(async () => {
  try {
    await mongoClient.connect()
    console.log('Connected to MongoDB Atlas')
  } catch (err) {
    console.error('Error connecting to MongoDB:', err)
    process.exit(1)
  }
  app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`)
    console.log('---------------------------------')
    console.log(`Stytch project ID: ${process.env.STYTCH_PROJECT_ID}`)
    console.log(`CREATE_AUTH_LEVEL: ${process.env.CREATE_AUTH_LEVEL}`)
    console.log(`READ_AUTH_LEVEL: ${process.env.READ_AUTH_LEVEL}`)
    console.log(`UPDATE_AUTH_LEVEL: ${process.env.UPDATE_AUTH_LEVEL}`)
    console.log(`DELETE_AUTH_LEVEL: ${process.env.DELETE_AUTH_LEVEL}`)
  })
})()
