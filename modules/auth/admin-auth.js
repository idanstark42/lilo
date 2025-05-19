const HeaderAuth = require('./header-auth')

const ADMINS = process.env.ADMINS.split(',')

class AdminAuth extends HeaderAuth {
  async authenticate (authHeader, options) {
    if (this.allowWithoutAuth(options)) {
      return
    }

    await super.authenticate(authHeader, options)
    const user = await this.stytch.users.get({ user_id: this.userId })
    if (!user) this.raise('User not found')
    if (!ADMINS.includes(this.userId)) this.raise('This action is only available to admins, not for user ' + this.userId)
  }
}

module.exports = AdminAuth