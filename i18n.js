const i18next = require('i18next')
const i18nextBackend = require('i18next-fs-backend')
const i18nextMiddleware = require('i18next-http-middleware')

i18next.use(i18nextBackend).use(i18nextMiddleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    backend: {
      loadPath: './lang/{{lng}}.json'
    }
  })

const langMiddleware = i18nextMiddleware.handle(i18next)

module.exports = langMiddleware