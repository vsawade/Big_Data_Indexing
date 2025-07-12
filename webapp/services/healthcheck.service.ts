import database from '../../shared/config/database'
import logger from '../../shared/config/logger'

interface IHealthCheckService {
  databaseHealthCheck(): Promise<boolean>
}

class HealthCheckService implements IHealthCheckService {
  async databaseHealthCheck(): Promise<boolean> {
    try {
      await database.getDatabaseConnection().ping()
      return true
    } catch {
      logger.error('Database health check failed')
      return false
    }
  }
}

const healthCheckService: IHealthCheckService = new HealthCheckService()

export default healthCheckService
