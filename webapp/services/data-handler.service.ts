/* eslint-disable @typescript-eslint/no-explicit-any */
import jsonParser from '../config/json.parser'
import { DataRecord, DataRecordParent } from '../../shared/types/message'
import { Model } from '../../shared/types/model'
import { SchemaTypeEnum, ObjectSchema, ArraySchema, SchemaModel } from '../../shared/types/schema.model'
import { HttpStatusError } from '../utils/errors'
import { Ok, Result } from '../../shared/utils/result'

const SEPERATOR = ':'

const getAllKeyValuesByModel = async (
  data: any,
  schemaModel: Model,
  ignoreKeyAssignment: boolean = false
): Promise<Result<DataRecord[], HttpStatusError>> => {
  const schema = await jsonParser.getSchema(schemaModel)
  if (!schema.ok) return schema

  const records = getAllKeyValues(data, schema.value, ignoreKeyAssignment)
  return Ok(records)
}

const getAllKeyValues = (data: any, schemaModel: SchemaModel, ignoreKeyAssignment: boolean = false): DataRecord[] => {
  const records: Record<string, DataRecord> = {}
  if (schemaModel.type === SchemaTypeEnum.OBJECT) {
    _objectDataHandler(data, schemaModel, null, records, ignoreKeyAssignment)
  } else if (schemaModel.type === SchemaTypeEnum.ARRAY) {
    _arrayDataHandler(data, schemaModel, null, records, ignoreKeyAssignment)
  }

  return Object.values(records)
}

const _objectDataHandler = (
  data: any,
  model: ObjectSchema,
  parent: DataRecordParent | null,
  records: Record<string, DataRecord>,
  ignoreKeyAssignment: boolean
): string => {
  const objectKey = `${data['objectType']}${SEPERATOR}${data['objectId']}`
  const value: Record<string, any> = {}
  for (const [key, subModel] of Object.entries(model.properties)) {
    const parent: DataRecordParent = { objectType: data['objectType'], objectId: data['objectId'], objectKey: key }
    if (data.hasOwnProperty(key)) {
      if (subModel.type === SchemaTypeEnum.OBJECT) {
        const output = _objectDataHandler(data[key], subModel, parent, records, ignoreKeyAssignment)
        if (!ignoreKeyAssignment) value[key] = output
      } else if (subModel.type === SchemaTypeEnum.ARRAY) {
        const output = _arrayDataHandler(data[key], subModel, parent, records, ignoreKeyAssignment)
        if (!ignoreKeyAssignment) value[key] = output
      } else {
        value[key] = data[key]
      }
    }
  }
  const record: DataRecord = { objectType: data['objectType'], objectId: data['objectId'], parent, value }
  records[objectKey] = record
  return objectKey
}

const _arrayDataHandler = (
  data: any,
  model: ArraySchema,
  parent: DataRecordParent | null,
  records: Record<string, DataRecord>,
  ignoreKeyAssignment: boolean
): string[] => {
  const childrenType = model.items.type
  if (childrenType === SchemaTypeEnum.OBJECT) {
    const redisKeys: string[] = []
    if (!Array.isArray(data)) throw new Error('Data is not an array')
    for (let i = 0; i < data.length; i++) {
      const value = data[i]
      const redisKey = _objectDataHandler(value, model.items, parent, records, ignoreKeyAssignment)
      redisKeys.push(redisKey)
    }
    return redisKeys
  } else if (childrenType === SchemaTypeEnum.ARRAY) {
    return _arrayDataHandler(data, model.items, parent, records, ignoreKeyAssignment)
  }
  return []
}

const dataHandlerService = {
  getAllKeyValuesByModel,
  getAllKeyValues
}

export default dataHandlerService
