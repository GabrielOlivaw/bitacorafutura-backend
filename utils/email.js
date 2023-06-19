const nodemailer = require('nodemailer')

const config = require('./config')
const logger = require('./logger')

const transporter = nodemailer.createTransport({
  service: config.BITACORAFUTURA_EMAIL.service,
  auth: {
    user: config.BITACORAFUTURA_EMAIL.user,
    pass: config.BITACORAFUTURA_EMAIL.password
  }
})

const options = {
  from: config.BITACORAFUTURA_EMAIL.user
}

const sendEmail = (to, subject, text) => {
  const currentMailOptions = {
    ...options, to, subject, text
  }

  transporter.sendMail(currentMailOptions, (error, info) => {
    if (error) logger.error(error)
    else logger.info(`Email sent: ${info.response}`)
  })
}

exports.sendEmail = sendEmail