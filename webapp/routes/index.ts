import { Application } from 'express'
import healthCheckController from '../controller/healthcheck.controller'
import { nocache, authorized } from '../config/middleware'
import { handleResponse } from '../utils/response'
import errors from '../utils/errors'
import planController from '../controller/plan.controller'

const routes = (app: Application) => {
  // Health Check route
  app.use('/healthz', nocache(), healthCheckController)

  app.use('/v1/plan', authorized(), planController)

  // Default fallback route
  app.route('*').all((_, res) => {
    handleResponse(res, errors.notFoundError('404 Not Found'))
  })
}

export default routes
