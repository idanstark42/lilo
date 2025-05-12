const HeaderAuth = require('./header-auth')

class PermissionsAuth extends HeaderAuth {
  async authenticate (authHeader, options) {
    if (this.allowWithoutAuth(options)) {
      return
    }

    await super.authenticate(authHeader, options)
    const user = await this.stytch.users.get({ user_id: this.userId })
    if (!user) this.raise('User not found')
    this.permissions = user.trusted_metadata.permissions
    if (!this.permissions) { this.permissions = [] }
  }

  filter (filter, options) {
    if (this.allowWithoutAuth(options)) {
      return filter
    }

    const $or = [
      { _id: { $in: [...this.permissions] } },
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
