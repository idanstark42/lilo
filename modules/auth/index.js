const express = require('express')
const { Client: StytchClient } = require('stytch')

const NoAuth = require('./no-auth')
const PersonalAuth = require('./personal-auth')
const PermissionsAuth = require('./permissions-auth')
const AdminAuth = require('./admin-auth')

// Stytch client setup
const stytch = new StytchClient({
  project_id: process.env.STYTCH_PROJECT_ID,
  secret: process.env.STYTCH_SECRET
})

const AUTH_TYPES = {
  none: () => new NoAuth(),
  personal: () => new PersonalAuth(),
  permissions: () => PermissionsAuth(),
  admin: () => new AdminAuth()
}

function getAuth (authType) {
  return (AUTH_TYPES[authType] || AUTH_TYPES.none) (stytch)
}

exports.getAuth = getAuth