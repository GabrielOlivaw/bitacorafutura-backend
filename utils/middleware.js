const logger = require('./logger')
const jwt = require('jsonwebtoken')

const { localizeValidationErrors } = require('../utils/utils')

const tokenExtractor = (request, response, next) => {
  const authorization = request.get('authorization')
  if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
    request.token = authorization.substring(7)
  }

  next()
}

const userExtractor = (request, response, next) => {
  const token = request.token
  const decodedToken = jwt.verify(token, process.env.SECRET)
  request.user = decodedToken.id.toString()

  next()
}

const requestLogger = (request, response, next) => {
  logger.info(request.method, request.path)
  logger.info(request.body)
  logger.info('#######################')

  next()
}

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: request.t('Unknown endpoint') })
}

const errorHandler = (error, request, response, next) => {
  logger.error(error.message)

  switch (error.name) {
    case 'UnknownResourceError':
      return response.status(error.code).send({ error: error.message })
    
    case 'CastError':
      return response.status(400).send({ error: request.t('error-malformattedid') })
    
    case 'ValidationError':
      return response.status(400).json({ error: { errors: localizeValidationErrors(error, request.t) } })
    
    case 'PermissionError':
      return response.status(error.code).json({ error: error.message })
    
    case 'JsonWebTokenError':
      if (error.message.toLowerCase() === 'jwt must be provided' ) {
        return response.status(401).json({ error: request.t('error-jsonwebtoken-unlogged') })
      }
      return response.status(401).json({ error: request.t('error-jsonwebtoken-session', { message: error.message }) })
    
    case 'AuthenticationError':
      return response.status(error.code).json({ error: error.message, field: error.field })
    
    case 'TypeError':
      return response.status(400).json({ error: 'Type error' })
    
    case 'SyntaxError':
      return response.status(400).json({ error: 'Syntax error' })
  }
  
  next(error)
}

module.exports = {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  tokenExtractor,
  userExtractor
}