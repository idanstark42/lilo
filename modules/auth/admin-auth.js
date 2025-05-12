const HeaderAuth = require('./header-auth')

class AdminAuth extends HeaderAuth {
  async authenticate (authHeader) {
    await super.authenticate(authHeader)
    const user = await this.stytch.users.get({ user_id: this.userId })
    if (!user) this.raise('User not found')
    if (!user.admin) this.raise('This action is only available to admins')
  }
}

module.exports = AdminAuth