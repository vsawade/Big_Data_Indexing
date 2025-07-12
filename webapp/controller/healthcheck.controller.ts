import express, { Router } from 'express'
import healthCheckService from '../services/healthcheck.service'
import { StatusCodes } from 'http-status-codes'

const healthCheckController: Router = express.Router()

healthCheckController
  .get('/', async (req, res) => {
    const isBodyPresent = Object.keys(req.body).length > 0
    const areQueryParamsPresent = req.query && Object.keys(req.query).length > 0
    if (isBodyPresent || areQueryParamsPresent) {
      res.status(StatusCodes.BAD_REQUEST).send()
      return
    }
    const result = await healthCheckService.databaseHealthCheck()
    res.status(result ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE).send()
  })
  .all('/', (_, res) => {
    res.status(StatusCodes.METHOD_NOT_ALLOWED).send()
  })

export default healthCheckController
