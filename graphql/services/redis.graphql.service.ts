import database from '../../shared/config/database'
import keyUtils from '../../shared/utils/key-utils'
import validator from '../../shared/utils/validator'

const redisDatabase = database.getDatabaseConnection()

const resolveKey = async <T>(key: string): Promise<T> => {
  const value = await redisDatabase.get(key)
  if (!value) throw new Error('Key not found')
  return JSON.parse(value) as T
}

const resolveKeys = async <T>(keys: string[]): Promise<T[]> => {
  const promises = keys.map((key) => resolveKey<T>(key))
  const result: T[] = await Promise.all(promises)
  return result.filter(validator.notNull)
}

const getKeys = async (prefix: string): Promise<string[]> => {
  return await redisDatabase.keys(keyUtils.getKey('*', prefix))
}

const redisGraphQLService = {
  getKeys,
  resolveKey,
  resolveKeys
}

export default redisGraphQLService
