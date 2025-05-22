const Mux = require('@mux/mux-node')
const express = require('express')
const bodyParser = require('body-parser')

const { log } = require('./log')
const { getAuth } = require('./auth')
const { mongoClient } = require('./database')

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET
})

const MUX_WEBHOOK_SECRET = process.env.MUX_WEBHOOK_SECRET

exports.router = () => {
  const router = express.Router()

  router.get('/upload-url', express.json(), async (req, res) => {
    const authType = process.env.VIDEO_UPLOAD_AUTH_TYPE
    const auth = getAuth(authType)
    log.info(`Get upload URL (authType=${authType})`)

    try {
      await auth.authenticate(req.headers.authorization)
      const upload = await mux.video.uploads.create({
        cors_origin: 'https://localhost:5173', 
        new_asset_settings: {
          playback_policy: ['signed'],
          video_quality: 'basic'
        }
      })
      res.status(200).json({ success: true, url: upload.url })
    } catch (err) {
      log.error(err)
      res.status(err.status || 500).json({ success: false, error: err.message || 'Internal Server Error' })
    }
  })

  router.post('/webhooks', bodyParser.text({ type: 'application/json' }), async (req, res) => {
    try {
      // will raise an exception if the signature is invalid
      mux.webhooks.verifySignature(req.body, req.headers, MUX_WEBHOOK_SECRET)
      // convert the raw req.body to JSON, which is originally Buffer (raw)
      const event = JSON.parse(req.body)
      const handler = EVENT_HANDLERS[event.type]
      if (handler) {
        handler(event)
      }
      res.json({ received: true })
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }
  })

  router.get('/signingkey/:playbackId', async (req, res) => {
    console.log(req.params.playbackId)
    const tokens = await mux.jwt.signPlaybackId(req.params.playbackId, {
      expiration: '1d',
      type: ['video', 'thumbnail', 'storyboard', 'drm_license']
    })
    res.status(200).json({ tokens })
  })

  return router
}

const EVENT_HANDLERS = {
  'video.asset.ready': async event => {
    console.log(event)
    const db = mongoClient.db(process.env.DATABASE_NAME)
    const dbCollection = db.collection(process.env.VIDEOS_COLLECTION)
    return await dbCollection.insertOne({
      assetId: event.object.id,
      playbackId: event.data.playback_ids[0],
      public: true,
      metadata: {
        duration: event.data.duration,
        createdAt: event.created_at
      }
    })
  }
}
