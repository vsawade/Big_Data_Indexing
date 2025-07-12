const SEPERATOR = ':'
const ETAG_CONSTANT = 'eTag'

const getKey = (objectId: string, objectType: string) => {
  return `${objectType}${SEPERATOR}${objectId}`
}

const getEtagKey = (redisKey: string) => {
  return `${ETAG_CONSTANT}${SEPERATOR}${redisKey}`
}

const keyUtils = {
  getKey,
  getEtagKey
}

export default keyUtils
