import { StatusCodes } from 'http-status-codes'
import { HttpStatusError } from './errors'
import { Result, ResultError } from '../../shared/utils/result'
import { Response } from 'express'

const handleErrorResponse = <E extends Error>(res: Response, data: ResultError<E>) => {
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR
  if (data && data.error instanceof HttpStatusError) {
    statusCode = data.error.statusCode

    // Special case to handle bad request errors
    if (statusCode === StatusCodes.BAD_REQUEST && !data.error.ignoreMessage) {
      const message = {
        error: data.error.messageObject
      }
      res.status(statusCode).json(message)
      return
    }
  }
  res.status(statusCode).send()
}
// .status(getStatusCode(data)).json({ error: data.error.message }
export const handleResponse = <T, E extends Error>(
  res: Response,
  data: Result<T, E>,
  statusCode: number = StatusCodes.OK
) => {
  if (data.ok) {
    res.status(statusCode).json(data.value)
  } else {
    handleErrorResponse(res, data)
  }
}
