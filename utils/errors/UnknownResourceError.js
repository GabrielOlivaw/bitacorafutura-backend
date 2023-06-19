class UnknownResourceError extends Error {
  constructor(message) {
    super(message)

    this.name = 'UnknownResourceError'
    this.code = message ? 400 : 404
  }
}

module.exports = UnknownResourceError