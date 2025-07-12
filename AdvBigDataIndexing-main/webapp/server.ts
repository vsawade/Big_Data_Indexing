import express from 'express'
import cors from 'cors'
import * as httpContext from 'express-http-context'

import env from '../shared/config/env'
import routes from './routes/index'
import logger from '../shared/config/logger'
import database from '../shared/config/database'
import { jsonErrorHandler } from './config/middleware'

// Setup .env file
env.loadEnv()

// Setup Express Server
const port = env.getOrDefault('PORT', '8080')
const app = express()

// Setup http context
app.use(httpContext.middleware)

// Setup Express Middlewares
app.use(express.json())
app.use(jsonErrorHandler())
app.use(express.urlencoded({ extended: true }))
app.use(express.text({ type: 'text/*' }))
app.use(cors())

// Setup routes
routes(app)

// Express Server
app.listen(port, async () => {
  try {
    await database.connect()
    logger.info(`Database connection established`)
  } catch (error) {
    logger.error(`Database connection error: ${error.message}`)
  }
  logger.info(`Server listening on port ${port}`)
})

export default app
