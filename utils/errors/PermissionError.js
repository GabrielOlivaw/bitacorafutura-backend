class PermissionError extends Error {
  constructor(message) {
    super(message)

    this.name = 'PermissionError'
    this.code = 401
  }
}

module.exports = PermissionError