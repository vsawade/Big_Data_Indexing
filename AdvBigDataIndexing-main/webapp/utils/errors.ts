import { StatusCodes } from 'http-status-codes'
import { ResultError } from '../../shared/utils/result'

export class HttpStatusError extends Error implements ResultError<HttpStatusError> {
  statusCode: number
  ok: false
  error: this
  ignoreMessage: boolean
  messageObject: unknown

  constructor(message: string | unknown, statusCode: number, ignoreMessage: boolean = false) {
    super(typeof message === 'string' ? message : JSON.stringify(message))
    this.statusCode = statusCode
    this.name = 'HttpStatusError'
    this.ok = false
    this.error = this
    this.ignoreMessage = ignoreMessage
    this.messageObject = message
  }
}

const errors = {
  unAuthorizedError: () => new HttpStatusError('Unauthorized', StatusCodes.UNAUTHORIZED),
  serviceUnavailableError: (message: string) => new HttpStatusError(message, StatusCodes.SERVICE_UNAVAILABLE),
  notFoundError: (message: string) => new HttpStatusError(message, StatusCodes.NOT_FOUND),
  internalServerError: (message: string) => new HttpStatusError(message, StatusCodes.INTERNAL_SERVER_ERROR),
  methodNotAllowedError: (message?: string) => new HttpStatusError(message ?? '', StatusCodes.METHOD_NOT_ALLOWED),
  validationError: (message: string | unknown, ignoreMessage: boolean = false) =>
    new HttpStatusError(message, StatusCodes.BAD_REQUEST, ignoreMessage)
}

export default errors
