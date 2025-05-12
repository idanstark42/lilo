const AuthType = require('./auth-type')

class HeaderAuth extends AuthType {
  async authenticate (authHeader, options) {
    if (this.allowWithoutAuth(options)) {
      return
    }

    if (!authHeader) this.raise('Missing auth header')
    const [_type, session_token] = authHeader.split(' ')
    if (!session_token) this.raise('Missing session token')
    try {
      const response = await this.stytch.sessions.authenticate({ session_token })
      if (!response.session.user_id) this.raise('Missing user id')
      this.userId = response.session.user_id
    } catch (err) {
      this.raise(`Error occurred ${err.message}`)
    }
  }

  allowWithoutAuth (options) {
    // Check fields that allow access without auth
    const protectedFields = this.flags.filter(flag => flag.includes('protected-field ')).map(flag => flag.split(':')[1])
    return protectedFields.length > 0 &&
      options &&
      options.projection &&
      protectedFields.every(field => !options.projection.hasOwnProperty(field) || options.projection[field] === 0)
  }
}

module.exports = HeaderAuth
