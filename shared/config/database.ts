import { RedisClientType, createClient } from 'redis'
import env from './env'
import logger from './logger'

export interface IDatabase {
  connect(): Promise<RedisClientType>
  getDatabaseConnection(): RedisClientType
  closeDatabaseConnection(): Promise<string>
}

class Database implements IDatabase {
  private _redis: RedisClientType

  public constructor() {
    this._redis = createClient({
      socket: {
        host: env.getOrDefault('REDIS_HOST', 'localhost'),
        port: parseInt(env.getOrDefault('REDIS_PORT', '6379')),
        reconnectStrategy: 5000
      },
      pingInterval: 2000
    })
    this._redis.on('error', (error) => {
      logger.error(`Cannot connect to redis or redis error: ${error}`)
    })
  }
  connect = async (): Promise<RedisClientType> => {
    return await this._redis.connect()
  }

  getDatabaseConnection(): RedisClientType {
    return this._redis
  }

  closeDatabaseConnection(): Promise<string> {
    return this._redis.quit()
  }
}

env.loadEnv()
const database: IDatabase = new Database()
export default database
