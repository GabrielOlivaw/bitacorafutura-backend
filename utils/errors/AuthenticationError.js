class AuthenticationError extends Error {
  constructor(message, field) {
    super(message)

    this.name = 'AuthenticationError'
    this.field = field
    this.code = 400
  }
}

module.exports = AuthenticationError
