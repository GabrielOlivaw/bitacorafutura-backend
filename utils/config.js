require('dotenv').config()

const PORT = process.env.PORT

const MONGODB_URI = process.env.NODE_ENV === 'test'
  ? process.env.TEST_MONGODB_URI
  : process.env.MONGODB_URI


const BASEURL_FRONT = process.env.BASEURL_FRONT

const BITACORAFUTURA_EMAIL = {
  user: process.env.BITACORAFUTURA_EMAIL_ADDRESS,
  password: process.env.BITACORAFUTURA_EMAIL_PASSWORD,
  service: process.env.BITACORAFUTURA_EMAIL_SERVICE
}

module.exports = {
  PORT, MONGODB_URI, BASEURL_FRONT, BITACORAFUTURA_EMAIL
}
