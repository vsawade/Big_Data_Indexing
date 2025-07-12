import winston from 'winston'
import env from './env'

const { combine, timestamp, printf, align } = winston.format
const logLevels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5
}

const logFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`
})

const logFolder = env.getOrDefault('LOG_FOLDER', './logs')
const logFileName = env.getOrDefault('LOG_FILE_NAME', 'server.log')
const defaultLogLevel = env.getOrDefault('LOG_LEVEL', 'info')

const transports = [
  new winston.transports.Console(),
  new winston.transports.File({ filename: `${logFolder}/${logFileName}`, level: defaultLogLevel })
]

const logger = winston.createLogger({
  levels: logLevels,
  level: defaultLogLevel,
  format: combine(timestamp({ format: 'YYYY-MM-DD hh:mm:ss A' }), align(), logFormat),
  transports: transports
})

export default logger
