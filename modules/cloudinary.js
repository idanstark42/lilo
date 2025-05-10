const cloudinary = require('cloudinary').v2
const express = require('express')
const { log } = require('./log')
const { getAuth } = require('./auth')

exports.router = () => {
  const router = express.Router()

  router.post('/', async (req, res) => {
    const image = req.files?.image?.tempFilePath
    const authType = process.env.IMAGE_AUTH_TYPE
    const auth = getAuth(authType)
    log.info(`Upload image (authType=${authType})`)

    try {
      await auth.authenticate(req.headers.authorization)
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

  return router
}