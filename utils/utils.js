const bcrypt = require('bcrypt')
const AuthenticationError = require('./errors/AuthenticationError')

const passwordToHash = async (password, t) => {
  const PASS_MINLENGTH = 8

  if (password.length < PASS_MINLENGTH) {
    throw new AuthenticationError(t('users-error-form-password-minlength', { minlength: PASS_MINLENGTH }), 'password')
  }
  
  const saltRounds = 10
  const passwordHash = await bcrypt.hash(password, saltRounds)

  return passwordHash
}

// Inspects every validation error from middleware and shows it in the current language
const localizeValidationErrors = (error, t) => {
  const errorModel = error._message.split(' ')[0].toLowerCase()

  const errors = Object.keys(error.errors).map(field => {
    let currentError = error.errors[field]
    let message = ''

    switch (currentError.kind) {
      case 'unique':
        message = t(`${errorModel}s-error-form-${field}-unique`)
        break
      case 'required':
        message = t(`${errorModel}s-error-form-${field}-required`)
        break
      case 'minlength':
        message = t(`${errorModel}s-error-form-${field}-minlength`,
          { minlength: currentError.properties.minlength }
        )
        break
      case 'user defined':
        if (field === 'email') {
          message = t('users-error-form-email-valid')
        }
        break          
    }

    return { field, message }
  })

  return errors
}

exports.passwordToHash = passwordToHash
exports.localizeValidationErrors = localizeValidationErrors