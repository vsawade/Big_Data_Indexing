import * as dotenv from 'dotenv'

const loadEnv = () => {
  dotenv.config()
}

const getOrDefault = (key: string, defaultValue: string): string => {
  if (process.env[key]) {
    return process.env[key] as string
  }
  return defaultValue
}

const env = {
  loadEnv,
  getOrDefault
}

export default env
