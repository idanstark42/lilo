class AuthType {
  constructor (stytch, flags) {
    this.stytch = stytch
    this.flags = flags
  }

  // Throw an error if authentication fails
  async authenticate (_authHeader) {
    // Do nothing in abstract class
    return null
  }

  // Add filters to the query
  filter (filter, _options) {
    // Do nothing in abstract class
    return filter
  }

  // Enrich the data
  enrich (data) {
    // Do nothing in abstract class
    return data
  }

  raise (reason) {
    throw { status: 401, message: `Authentication failed: ${reason}` }
  }
}

module.exports = AuthType
