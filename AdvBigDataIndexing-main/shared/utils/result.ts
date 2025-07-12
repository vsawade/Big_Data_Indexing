export interface ResultOk<T> {
  ok: true
  value: T
}
export interface ResultError<E extends Error> {
  ok: false
  error: E
}
export type Result<T, E extends Error> = ResultOk<T> | ResultError<E>

export const Ok = <T>(data: T): Result<T, never> => {
  return { ok: true, value: data }
}

export const Err = <T extends Error>(error: T): ResultError<T> => {
  return { ok: false, error }
}
