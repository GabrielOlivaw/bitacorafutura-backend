const http = require('http')
const app = require('./app')
const config = require('./utils/config')
const logger = require('./utils/logger')

const server = http.createServer(app)

app.listen(config.PORT, () => {
  logger.info(`bitacorafutura-backend listening on port ${config.PORT}`)
})
