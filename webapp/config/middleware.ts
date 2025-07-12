import { Request, Response, NextFunction } from 'express'
import logger from '../../shared/config/logger'
import errors from '../utils/errors'
import { handleResponse } from '../utils/response'
import healthCheckService from '../services/healthcheck.service'
import authService from '../services/auth.service'

const HEADER_KEY = 'Bearer'

export const jsonErrorHandler = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err: Error, req: Request, res: Response, _: NextFunction) => {
    logger.error(`Error: ${err.message} Request body: ${req.body}`)
    handleResponse(res, errors.validationError('Malformed JSON in request body', true))
  }
}

export const dbHealthCheck = () => {
  return async (_: Request, res: Response, next: NextFunction) => {
    const isHealthy = await healthCheckService.databaseHealthCheck()
    if (!isHealthy) {
      handleResponse(res, errors.serviceUnavailableError('Database is not healthy'))
      return
    }
    next()
  }
}

export const nocache = () => {
  return (_: Request, res: Response, next: NextFunction) => {
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Surrogate-Control', 'no-store')
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.setHeader('Expires', '0')
    next()
  }
}

export const noQueryParams = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const areQueryParamsPresent = req.query && Object.keys(req.query).length > 0
    if (areQueryParamsPresent) {
      handleResponse(res, errors.validationError('Query parameters are not allowed'))
      return
    }
    next()
  }
}

export const authorized = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authToken = getBearerToken(req)
      if (!authToken) return handleResponse(res, errors.unAuthorizedError())

      // Google OAuth2 token verification
      const isUserAuthorized = await authService.isUserAuthorized(authToken)
      if (!isUserAuthorized) return handleResponse(res, errors.unAuthorizedError())

      // Handle only authorized requests
      next()
    } catch (error) {
      return handleResponse(res, errors.unAuthorizedError())
    }
  }
}

const getBearerToken = (req: Request) => {
  if (req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ')
    if (parts.length === 2 && parts[0] === HEADER_KEY) {
      return parts[1]
    }
  }
  return null
}
