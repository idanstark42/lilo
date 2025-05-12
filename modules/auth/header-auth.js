const AuthType = require('./auth-type')

class HeaderAuth extends AuthType {
  async authenticate (authHeader) {
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
}

module.exports = HeaderAuth
