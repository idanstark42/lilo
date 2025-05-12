const HeaderAuth = require('./header-auth')

class PersonalAuth extends HeaderAuth {
  async authenticate (authHeader) {
    await super.authenticate(authHeader)
    const user = await this.stytch.users.get({ user_id: this.userId })
    if (!user) this.raise()
    this.permissions = user.trusted_metadata.permissions
    if (!this.permissions) { this.permissions = [] }
  }

  filter (filter) {
    filter._id = { $in: this.permissions }
    return filter
  }
}

module.exports = PersonalAuth
