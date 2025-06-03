const AuthType = require('./auth-type')

class MultipleAuth extends AuthType {
  constructor (stytch, type, subauths) {
    super(stytch, [])
    this.type = type
    this.subauths = subauths
  }

  async authenticate (...params) {
    return await this[this.type](...params)
  }

  async or (...params) {
    const results = await this.results(...params)
    return results.some(Boolean)
  }

  async and (...params) {
    const results = await this.results(...params)
    return results.every(Boolean)
  }

  async results (...params) {
    const results = []
    for (let i in this.subauths) {
      const subauth = this.subauths[i]
      try {
        await subauth.authenticate(...params)
        results[i] = true
      } catch {
        results[i] = false
      }
    }
    return results
  }
}

module.exports = MultipleAuth