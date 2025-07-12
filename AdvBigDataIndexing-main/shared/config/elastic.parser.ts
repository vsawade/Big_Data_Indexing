import { DataRecord } from '../types/message'
import { Model } from '../types/model'
import { Err, Ok, Result } from '../utils/result'

export type ElasticJoinObject = {
  objectId: string
  object: Record<string, unknown>
}

const getMappings = async (model: Model): Promise<Result<object, Error>> => {
  const elasticMappings = await model.elasticMappings()
  if (!elasticMappings) {
    if (!model.fallbackElasticMappings) return Err(new Error('Elastic mappings not found for model: ' + model.key))
    return Ok(model.fallbackElasticMappings)
  } else {
    return Ok(JSON.parse(elasticMappings))
  }
}

const convertToElasticJoinObject = (record: DataRecord, joinKey: string): ElasticJoinObject => {
  const result: Record<string, unknown> = Object.assign({}, record.value) as Record<string, unknown>
  if (record.parent) {
    result[joinKey] = {
      name: record.parent.objectKey,
      parent: record.parent.objectId
    }
  } else {
    result[joinKey] = {
      name: record.objectType
    }
  }

  return {
    objectId: record.objectId,
    object: result
  }
}

const elasticParser = {
  getMappings,
  convertToElasticJoinObject
}

export default elasticParser
