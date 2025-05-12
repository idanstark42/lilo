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
  none: (...args) => new NoAuth(...args),
  personal: (...args) => new PersonalAuth(...args),
  permissions: (...args) => new PermissionsAuth(...args),
  admin: (...args) => new AdminAuth(...args)
}

function getAuth (authType) {
  return (AUTH_TYPES[authType] || AUTH_TYPES.none) (stytch)
}

exports.getAuth = getAuth