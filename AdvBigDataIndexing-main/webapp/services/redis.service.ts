/* eslint-disable @typescript-eslint/no-explicit-any */
import { RedisClientType } from 'redis'
import database from '../../shared/config/database'
import jsonParser from '../config/json.parser'
import { Model } from '../../shared/types/model'
import { ArraySchema, ObjectSchema, SchemaTypeEnum } from '../../shared/types/schema.model'
import errors, { HttpStatusError } from '../utils/errors'
import { Ok, Result } from '../../shared/utils/result'
import { IDatabase } from '../../shared/config/database'
import dataHandlerService from './data-handler.service'
import validator from '../../shared/utils/validator'
import keyUtils from '../../shared/utils/key-utils'

const ALL_VALUES = '*'

type RedisGetResult = {
  result: any
  keys: string[]
}

export interface IRedisService {
  doesKeyExist: (objectId: string) => Promise<boolean>
  save: (objectId: string, data: any, isUpdate?: boolean) => Promise<Result<string[], HttpStatusError>>
  get: <T>(objectId: string) => Promise<Result<T, HttpStatusError>>
  getAll: <T>() => Promise<T[]>
  delete: (objectId: string) => Promise<Result<string[], HttpStatusError>>
  setEtag: (objectId: string, eTag: string) => Promise<void>
  deleteEtag: (objectId: string) => Promise<void>
  getEtag: (objectId: string) => Promise<Result<string, HttpStatusError>>
}

class RedisService implements IRedisService {
  redisDatabase: RedisClientType
  model: Model

  constructor(database: IDatabase, model: Model) {
    this.redisDatabase = database.getDatabaseConnection()
    this.model = model
  }

  doesKeyExist = async (objectId: string) => {
    const redisKey = this._getKey(objectId)
    return await this._doesRedisKeyExists(redisKey)
  }

  save = async (objectId: string, data: any, isUpdate?: boolean): Promise<Result<string[], HttpStatusError>> => {
    let existingKeys: string[] = []
    if (isUpdate) {
      const existingData = await this._getWithMetadata(objectId)
      if (!existingData.ok) return existingData
      existingKeys = existingData.value.keys
    }

    const result = await dataHandlerService.getAllKeyValuesByModel(data, this.model)
    if (!result.ok) return result

    const records = result.value
    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      if (!record) continue
      const key = this._getKey(record.objectId, record.objectType)
      await this.redisDatabase.set(key, JSON.stringify(record.value))
    }

    if (isUpdate) {
      const newKeys = records.map((record) => this._getKey(record.objectId, record.objectType))
      const existingUnusedKeys = await this._deleteUnusedKeys(existingKeys, newKeys)
      return Ok(existingUnusedKeys)
    }
    return Ok([])
  }

  get = async <T>(objectId: string): Promise<Result<T, HttpStatusError>> => {
    const databaseResult = await this._getWithMetadata(objectId)
    return databaseResult.ok ? Ok(databaseResult.value.result) : databaseResult
  }

  getAll = async <T>(): Promise<T[]> => {
    const prefix = this._getKey('')
    const allPlanKeys = `${prefix}${ALL_VALUES}`
    const keys = await this.redisDatabase.keys(allPlanKeys)
    const valuePromises = keys.map(async (eachKey): Promise<T | null> => {
      const objectId = eachKey.replace(prefix, '')
      const val = await this.get<T>(objectId)
      return val.ok ? val.value : null
    })
    const data = await Promise.all(valuePromises)
    const results: T[] = data.filter(validator.notNull)
    return results
  }

  delete = async (objectId: string) => {
    const objectIdRedisKeys = await this._getWithMetadata(objectId)
    if (!objectIdRedisKeys.ok) return objectIdRedisKeys

    const keys = objectIdRedisKeys.value.keys
    await this.deleteEtag(objectId)
    if (keys.length === 0) return Ok([])
    const result = await this._deleteRedisKeys(keys)
    if (result === 0) return errors.internalServerError('Couldn"t delete keys from redis')
    return Ok(keys)
  }

  setEtag = async (objectId: string, eTag: string) => {
    const key = this._getKey(objectId)
    const redisKey = keyUtils.getEtagKey(key)
    await this.redisDatabase.set(redisKey, eTag)
  }

  getEtag = async (objectId: string) => {
    const redisKey = this._getKey(objectId)
    const eTagRedisKey = keyUtils.getEtagKey(redisKey)
    const doesKeyExist = await this._doesRedisKeyExists(eTagRedisKey)
    if (!doesKeyExist) return errors.notFoundError('ETag does not match/No ETag found')
    const value = await this.redisDatabase.get(eTagRedisKey)
    return Ok(value as string)
  }

  deleteEtag = async (objectId: string) => {
    const key = this._getKey(objectId)
    const redisKey = keyUtils.getEtagKey(key)
    await this.redisDatabase.del(redisKey)
  }

  private _getKey = (objectId: string, objectType?: string) => {
    const type = objectType ?? this.model.key
    return keyUtils.getKey(objectId, type)
  }

  private _doesRedisKeyExists = async (redisKey: string) => {
    const exists = await this.redisDatabase.exists(redisKey)
    return exists === 1
  }

  private _deleteRedisKeys = async (redisKeys: string[]) => {
    return await this.redisDatabase.del(redisKeys)
  }

  private _deleteUnusedKeys = async (existingKeys: string[], metadataKeys: string[]): Promise<string[]> => {
    const keysToDelete = existingKeys.filter((key) => !metadataKeys.includes(key))
    if (keysToDelete.length === 0) return []
    await this._deleteRedisKeys(keysToDelete)
    return keysToDelete
  }

  private _getWithMetadata = async (objectId: string): Promise<Result<RedisGetResult, HttpStatusError>> => {
    const redisKey = this._getKey(objectId)
    const isKeyExists = await this.doesKeyExist(objectId)
    if (!isKeyExists) return errors.notFoundError('Key not found')
    const schema = await jsonParser.getSchema(this.model)
    if (!schema.ok) return schema

    let result: RedisGetResult = { result: {}, keys: [] }
    const metadataKeys: string[] = []

    const schemaModel = schema.value
    switch (schemaModel.type) {
      case SchemaTypeEnum.OBJECT:
        const objResult = await this._getObjectDataFromRedis(redisKey, schemaModel, metadataKeys)
        result = { result: objResult, keys: metadataKeys }
        return Ok(result)
      case SchemaTypeEnum.ARRAY:
        const keys = redisKey.split(',')
        const arrResult = await this._getArrayDataFromRedis(keys, schemaModel, metadataKeys)
        result = { result: arrResult, keys: metadataKeys }
        return Ok(result)
      default:
        return Ok(result)
    }
  }

  private _getObjectDataFromRedis = async (
    redisKey: string,
    model: ObjectSchema,
    metadataKeys: string[]
  ): Promise<any> => {
    metadataKeys.push(redisKey)
    const redisValue = await this.redisDatabase.get(redisKey)
    if (!redisValue) return ''
    const value = JSON.parse(redisValue)
    const result: Record<string, any> = {}
    for (const [key, val] of Object.entries(model.properties)) {
      if (val.type === SchemaTypeEnum.OBJECT) {
        result[key] = await this._getObjectDataFromRedis(value[key], val, metadataKeys)
      } else if (val.type === SchemaTypeEnum.ARRAY) {
        result[key] = await this._getArrayDataFromRedis(value[key], val, metadataKeys)
      } else {
        result[key] = value[key]
      }
    }
    return result
  }

  private _getArrayDataFromRedis = async (
    keys: string[],
    model: ArraySchema,
    metadataKeys: string[]
  ): Promise<any[]> => {
    const childrenType = model.items.type
    const result: any[] = []
    if (childrenType === SchemaTypeEnum.OBJECT) {
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i] as string
        metadataKeys.push(key)
        const value = await this._getObjectDataFromRedis(key, model.items, metadataKeys)
        result.push(value)
      }
    } else if (childrenType === SchemaTypeEnum.ARRAY) {
      const value = await this._getArrayDataFromRedis(keys, model.items, metadataKeys)
      result.push(value)
    }
    return result
  }
}

const RedisServiceFactory = {
  create: (model: Model): IRedisService => {
    return new RedisService(database, model)
  }
}

export default RedisServiceFactory
