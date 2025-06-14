const express = require('express')
const { MongoClient, ObjectId } = require('mongodb')

const { getAuth } = require('./auth')
const { log } = require('./log')

const mongoClient = new MongoClient(process.env.MONGO_URI)

exports.mongoClient = mongoClient

exports.router = () => {
  const router = express.Router()

  router.use(express.json())

  router.post('/', async (req, res) => {
    const { action, collection, data, filter, options } = req.body
    const authType = process.env[`${collection.toUpperCase()}_${action.toUpperCase()}_AUTH_TYPE`]
    const auth = getAuth(authType)
    const handler = actionHandlers[action]
    
    log.info(`${action} (authType=${authType}) from ${collection} ${JSON.stringify(data)} ${JSON.stringify(filter)}`)

    if (!authType) {
      return res.status(400).json({
        success: false,
        error: `Missing ${collection.toUpperCase()}_${action.toUpperCase()}_AUTH_TYPE (set to ${authType})`
      })
    } else if (!handler) {
      return res.status(400).json({
        success: false,
        error: `Invalid action ${action} for collection ${collection}`
      })
    }

    try {
      await auth.authenticate(req.headers.authorization, { filter, options })
      const db = mongoClient.db(process.env.DATABASE_NAME)
      const dbCollection = db.collection(collection)
      const result = await handler(dbCollection, { auth, data, filter, options })

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

// action handlers
const actionHandlers = {
  create: async function handleCreate(dbCollection, { auth, data, options }) {
    auth.enrich(data)
    return await dbCollection.insertOne(data, options)
  },
  read: async function handleRead(dbCollection, { auth, filter, options }) {
    return await dbCollection.find(prepareFilter(auth.filter(filter, options)), options).toArray()
  },
  update: async function handleUpdate(dbCollection, { auth, filter, data, options }) {
    auth.enrich(data)
    const result = await dbCollection.updateOne(prepareFilter(auth.filter(filter, options)), { $set: data }, options)
    if (result.matchedCount === 0) throw { status: 404, message: 'No matching document found for update' }
    return result
  },
  delete: async function handleDelete(dbCollection, { auth, filter, options }) {
    const result = await dbCollection.deleteOne(prepareFilter(auth.filter(filter, options)), options)
    if (result.deletedCount === 0) throw { status: 404, message: 'No matching document found for deletion' }
    return result
  }
}

const prepareFilter = filter => {
  if (filter._id) {
    filter._id = new ObjectId(filter._id)
  }
  return filter
}