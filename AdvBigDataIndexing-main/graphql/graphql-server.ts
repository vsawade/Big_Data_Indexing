// @ts-expect-error - Ruru server doesn't export server types in index.d.ts
import { ruruHTML } from 'ruru/server'
import express from 'express'
import cors from 'cors'
import logger from '../shared/config/logger'
import database from '../shared/config/database'
import env from '../shared/config/env'
import { createHandler } from 'graphql-http/lib/use/express'
import schemas from './models'

// Setup .env file
env.loadEnv()

// Setup Express Server
const port = env.getOrDefault('PORT_GRAPHQL', '4000')
const app = express()

app.use(cors())

app.use('/graphql', createHandler({ schema: schemas }))

app.get('/', (_, res) => {
  res.type('html')
  res.end(ruruHTML({ endpoint: '/graphql' }))
})

// Express Server
database
  .connect()
  .then(async () => {
    logger.info(`Database connection established`)
    app.listen(port, () => {
      logger.info(`Server listening on port ${port}`)
    })
  })
  .catch((error) => {
    logger.error(`Database connection error: ${error.message}`)
  })

export default app
