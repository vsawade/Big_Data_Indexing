import * as expressHttpContext from 'express-http-context'

export const getUserIdFromContext = () => {
  return expressHttpContext.get('userid') ?? null
}

export const setUserIdInContext = (userId: string) => {
  expressHttpContext.set('userid', userId)
}

export interface IContext {
  getUserIdFromContext: () => string
  setUserIdInContext: (userId: string) => void
}

const httpContext: IContext = {
  getUserIdFromContext,
  setUserIdInContext
}

export default httpContext
