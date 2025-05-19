const Mux = require('@mux/mux-node')
const express = require('express')
const { log } = require('./log')
const { getAuth } = require('./auth')

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET
})

exports.router = () => {
  const router = express.Router()

  router.get('/upload-url', async (req, res) => {
    const authType = process.env.VIDEO_UPLOAD_AUTH_TYPE
    const auth = getAuth(authType)
    log.info(`Get upload URL (authType=${authType})`)

    try {
      await auth.authenticate(req.headers.authorization)
      const upload = mux.video.uploads.create({
        cors_origin: 'https://localhost:5173', 
        new_asset_settings: {
          playback_policy: ['private'],
          video_quality: 'basic'
        }
      })
      console.log(upload)
      res.status(200).json({ success: true, url: upload.url })
    } catch (err) {
      log.error(err)
      res.status(err.status || 500).json({ success: false, error: err.message || 'Internal Server Error' })
    }
})

  return router
}
