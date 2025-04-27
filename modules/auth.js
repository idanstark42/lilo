const express = require('express')
const { Client: StytchClient } = require('stytch')

// Stytch client setup
const stytch = new StytchClient({
    project_id: process.env.STYTCH_PROJECT_ID,
    secret: process.env.STYTCH_SECRET
  })

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

exports.handleAuth = handleAuth
exports.filterWithAuth = filterWithAuth
exports.router = () => {
  const router = express.Router()

  router.post('/create', async (req, res) => {
    const { email, subscriptionPlan } = req.body
    const userId = await handleAuth('personal', req.headers.authorization)
  
    try {
      const db = mongoClient.db()
      const usersCollection = db.collection('users')
  
      // Check if user already exists
      const user = await usersCollection.findOne({ email })
      if (user) {
        return res.status(400).json({ success: false, error: 'User already exists' })
      }
  
      // Create user document
      const newUser = {
        email,
        subscriptionPlan,
        userId,
        createdAt: new Date(),
        subscriptionExpiresAt: new Date(Date.now() + subscriptionPlan.duration * 1000), // expiry based on plan duration
      }
  
      await usersCollection.insertOne(newUser)
  
      res.status(201).json({ success: true, message: 'User created successfully', user: newUser })
    } catch (err) {
      log.error(err)
      res.status(500).json({ success: false, error: 'Internal Server Error' })
    }
  })

  return router
}