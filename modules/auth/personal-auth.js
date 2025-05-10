const HeaderAuth = require('./header-auth')

class PersonalAuth extends HeaderAuth {
  filter (filter) {
    filter.owner_id = this.userId
    return filter
  }

  enrich (data) {
    data.owner_id = userId
  }
}

module.exports = PersonalAuth
