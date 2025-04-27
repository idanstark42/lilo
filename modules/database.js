const express = require('express')
const { MongoClient } = require('mongodb')

const { handleAuth, filterWithAuth } = require('./auth')
const { log } = require('./logger')

const mongoClient = new MongoClient(process.env.MONGO_URI)

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

exports.router = () => {
  const router = express.Router()
  router.post('/', async (req, res) => {
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
  return router
}

exports.connectDatabase = async () => {
  try {
    await mongoClient.connect()
    log.debug('Connected to MongoDB Atlas')
  } catch (err) {
    log.error('Error connecting to MongoDB:', err)
    process.exit(1)
  }
}