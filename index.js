const dotenv = require('dotenv')
const express = require('express')
const cors = require('cors')
const fileupload = require('express-fileupload')

const { log } = require('./modules/log')
const { router: dBRouter, connectDatabase } = require('./modules/database')
const { router: cloudinaryRouter } = require('./modules/cloudinary')
const { router: muxRouter } = require('./modules/mux')

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(fileupload({ useTempFiles: true }))
app.use('/database', express.json(), dBRouter())
app.use('/image', express.json(), cloudinaryRouter())
app.use('/video', muxRouter())

;(async () => {
  await connectDatabase()
  app.listen(PORT, () => {
    log.info(`Server is running on ${PORT}`)
  })
})()
