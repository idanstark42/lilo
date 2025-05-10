class AuthType {
  constructor (stytch) {
    this.stytch = stytch
  }

  // Throw an error if authentication fails
  async authenticate (_authHeader) {
    // Do nothing in abstract class
    return null
  }

  // Add filters to the query
  filter (filter) {
    // Do nothing in abstract class
    return filter
  }

  // Enrich the data
  enrich (data) {
    // Do nothing in abstract class
    return data
  }

  raise () {
    throw { status: 401, message: 'Authentication failed' }
  }
}

module.exports = AuthType
