const HeaderAuth = require('./header-auth')

class AdminAuth extends HeaderAuth {
  async authenticate (authHeader, options) {
    if (this.allowWithoutAuth(options)) {
      return
    }

    await super.authenticate(authHeader, options)
    const user = await this.stytch.users.get({ user_id: this.userId })
    if (!user) this.raise('User not found')
    if (!user.admin) this.raise('This action is only available to admins')
  }
}

module.exports = AdminAuth