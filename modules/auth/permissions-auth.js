const HeaderAuth = require('./header-auth')

class PermissionsAuth extends HeaderAuth {
  async authenticate (authHeader) {
    await super.authenticate(authHeader)
    const user = await this.stytch.users.get({ user_id: this.userId })
    if (!user) this.raise('User not found')
    this.permissions = user.trusted_metadata.permissions
    if (!this.permissions) { this.permissions = [] }
  }

  filter (filter) {
    const $or = [
      { $in: this.permissions },
      { public: true }
    ]

    if (filter.$or) {
      filter.$or = { $and: [filter.$or, $or] }
    } else {
      filter.$or = $or
    }

    return filter
  }
}

module.exports = PermissionsAuth
