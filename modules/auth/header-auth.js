const AuthType = require('./auth-type')

class HeaderAuth extends AuthType {
  async authenticate (authHeader) {
    if (!authHeader) this.raise()
    const [_type, session_token] = authHeader.split(' ')
    if (!session_token) this.raise()
    try {
      const response = await this.stytch.sessions.authenticate({ session_token })
      if (!response.session.user_id) this.raise()
      this.userId = response.session.user_id
    } catch (err) {
      this.raise()
    }
  }
}

module.exports = HeaderAuth
