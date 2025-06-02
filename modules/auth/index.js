const express = require('express')
const { Client: StytchClient } = require('stytch')

const { log } = require('../log')
const NoAuth = require('./no-auth')
const PersonalAuth = require('./personal-auth')
const PermissionsAuth = require('./permissions-auth')
const AdminAuth = require('./admin-auth')
const MultipleAuth = require('./multiple-auth')

// Stytch client setup
const stytch = new StytchClient({
  project_id: process.env.STYTCH_PROJECT_ID,
  secret: process.env.STYTCH_SECRET
})

const AUTH_TYPES = {
  none: (...args) => new NoAuth(...args),
  personal: (...args) => new PersonalAuth(...args),
  permissions: (...args) => new PermissionsAuth(...args),
  admin: (...args) => new AdminAuth(...args)
}

function getAuth (authType) {
  const authTypeParts = authType.split(':')
  const authTypeName = authTypeParts[0]
  const authTypeFlags = authTypeParts.length > 1 ? authTypeParts[1].split('|') : []
  return (AUTH_TYPES[authTypeName] || AUTH_TYPES.none) (stytch, authTypeFlags)
}

exports.getAuth = getAuth

exports.router = () => {
  const router = express.Router()
  
  router.use(express.json())

  router.post('/update', async (req, res) => {
    const auth = new MultipleAuth('or', [getAuth('personal'), getAuth('admin')])
    await auth.authenticate(req.headers.authorization)
    log.info(`Updating user ${JSON.stringify(req.body)}`)
    const response = await stytch.users.update(req.body)
    res.status(200).json(response)
  })

  return router
}