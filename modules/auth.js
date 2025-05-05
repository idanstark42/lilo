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