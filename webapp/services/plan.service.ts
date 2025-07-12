import { Request, Response } from 'express'
import eTag from 'etag'
import { Operation, applyPatch, validate } from 'fast-json-patch'
import jsonmergepatch from 'json-merge-patch'

import RedisServiceFactory from './redis.service'
import jsonParser from '../config/json.parser'
import PlanModel, { Plan } from '../../shared/models/plan.model'
import errors, { HttpStatusError } from '../utils/errors'
import { Ok, Result } from '../../shared/utils/result'
import { handleResponse } from '../utils/response'
import QueueServiceFactory, { IProducer } from '../../shared/services/queue.service'
import { ProducerMessage, ProducerOperationType } from '../../shared/types/message'
import dataHandlerService from './data-handler.service'
import validator from '../../shared/utils/validator'
import logger from '../../shared/config/logger'

const redisService = RedisServiceFactory.create(PlanModel)
let queueProducerService: IProducer
const getProducer = async (): Promise<IProducer | null> => {
  if (queueProducerService) return queueProducerService
  try {
    queueProducerService = await QueueServiceFactory.create().createProducerClient()
  } catch (error) {
    logger.error('Error creating queue producer client' + error.message)
  }
  return queueProducerService
}

const generateEtag = (stringifiedPlan: string | object) => {
  if (typeof stringifiedPlan === 'object') stringifiedPlan = JSON.stringify(stringifiedPlan)
  const jsonEtag = eTag(stringifiedPlan)
  const etag = jsonEtag.replace(/^"(.*)"$/, '$1')
  return etag
}

const savePlanToRedis = async (
  plan: Plan,
  isUpdate: boolean = false,
  ignoreKeyExists: boolean = false
): Promise<Result<[Plan, string], HttpStatusError>> => {
  const isOverride = isUpdate && ignoreKeyExists

  const objectId = plan.objectId

  const keyExists = await redisService.doesKeyExist(objectId)
  if (isUpdate && !keyExists) return errors.validationError('Object does not exist')
  else if (!isUpdate && keyExists) return errors.validationError('Object already exists')

  const deleteProducerMessage: ProducerMessage[] = []
  if (isOverride) {
    const result = await redisService.delete(objectId)
    if (result.ok) deleteProducerMessage.push(getDeletedKeysProducerMessage(result.value))
  }

  // Temporarily disabling the unused cache key deletion.
  // const unusedKeys = await redisService.save(objectId, plan, true)
  const unusedKeys = await redisService.save(objectId, plan)
  if (!unusedKeys.ok) return unusedKeys

  const planFromRedis = await redisService.get<Plan>(objectId)
  if (!planFromRedis.ok) return planFromRedis

  const eTagForPlan = generateEtag(planFromRedis.value)
  await redisService.setEtag(objectId, eTagForPlan)

  const records = await dataHandlerService.getAllKeyValuesByModel(plan, PlanModel, true)
  if (!records.ok) return records

  // Publish the message to the queue
  const producer = await getProducer()
  const message: ProducerMessage[] = [
    // Temporarily disabling the unused cache key deletion.
    // {
    //  operation: ProducerOperationType.DELETE,
    //  objectId: objectId,
    //  object: unusedKeys.value.map((key) => ({ key }))
    // },
    {
      operation: ProducerOperationType.CREATE,
      object: records.value
    }
  ]

  if (isOverride && deleteProducerMessage.length > 0) {
    const deleteMessage = deleteProducerMessage[0] as ProducerMessage
    message.unshift(deleteMessage)
  }

  producer?.produce(message)

  const result: [Plan, string] = [planFromRedis.value, eTagForPlan]
  return Ok(result)
}

const getDeletedKeysProducerMessage = (value: string[]): ProducerMessage => {
  const message: ProducerMessage = {
    operation: ProducerOperationType.DELETE,
    object: [...new Set(value)]
      .map((key) => {
        const [objectType, objectId] = key.split(':')
        if (objectId && objectType) return { objectId, objectType, value: null }
        return null
      })
      .filter(validator.notNull)
  }
  return message
}

const deletePlanFromRedis = async (objectId: string): Promise<Result<string[], HttpStatusError>> => {
  const result = await redisService.delete(objectId)
  if (result.ok) {
    const producer = await getProducer()
    const message = getDeletedKeysProducerMessage(result.value)
    producer?.produce([message])
  }
  return Ok([])
}

const getPlans = async (_: Request, res: Response) => {
  try {
    const results = await redisService.getAll()
    res.status(200).json(results)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const createPlan = async (req: Request, res: Response) => {
  try {
    const plan = req.body as Plan
    if (!plan) {
      res.status(400).json({ error: 'Missing plan in body' })
      return
    }
    const result = await jsonParser.validate(plan, PlanModel)
    if (!result.ok) {
      return handleResponse(res, result)
    }

    const saveResult = await savePlanToRedis(plan)
    if (!saveResult.ok) {
      return handleResponse(res, saveResult)
    }
    const [savedPlan, eTag] = saveResult.value
    res.status(201).setHeader('ETag', eTag).json(savedPlan)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const getPlanById = async (req: Request, res: Response) => {
  try {
    const { objectId } = req.params
    if (!objectId || objectId === '' || objectId === '{}') {
      res.status(400).json({ error: 'Missing objectId' })
      return
    }

    const keyExists = await redisService.doesKeyExist(objectId)
    if (!keyExists) {
      res.status(404).json({ error: `Object id doesn't exist` })
      return
    }

    const eTagFromRedis = await redisService.getEtag(objectId)
    if (!eTagFromRedis.ok) {
      return handleResponse(res, eTagFromRedis)
    }

    // Setting Etag
    res.setHeader('ETag', eTagFromRedis.value)

    const etagFromHeader = req.header('If-None-Match')
    if (etagFromHeader && etagFromHeader === eTagFromRedis.value) {
      res.status(304).send()
      return
    }

    const plan = await redisService.get(objectId)
    return handleResponse(res, plan)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const updatePlan = async (req: Request, res: Response) => {
  try {
    const plan = req.body as Plan
    if (!plan) {
      res.status(400).json({ error: 'Missing plan in body' })
      return
    }

    const { objectId } = req.params
    if (!objectId || objectId === '' || objectId === '{}') {
      res.status(400).json({ error: 'Missing objectId' })
      return
    }

    const result = await jsonParser.validate(plan, PlanModel)
    if (!result.ok) {
      return handleResponse(res, result)
    }

    const etagFromHeader = req.header('If-Match')
    if (!etagFromHeader) {
      res.status(400).json({ error: 'Missing If-Match header' })
      return
    }

    const eTagFromRedis = await redisService.getEtag(objectId)
    if (!eTagFromRedis.ok) {
      return handleResponse(res, eTagFromRedis)
    }

    if (etagFromHeader !== eTagFromRedis.value) {
      res.status(412).setHeader('ETag', eTagFromRedis.value).send({ error: 'ETag does not match' })
      return
    }

    const saveResult = await savePlanToRedis(plan, true, true)
    if (!saveResult.ok) {
      return handleResponse(res, saveResult)
    }
    const [savedPlan, updatedETag] = saveResult.value
    res.status(200).setHeader('ETag', updatedETag).json(savedPlan)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const deletePlan = async (req: Request, res: Response) => {
  try {
    const { objectId } = req.params
    if (!objectId || objectId === '' || objectId === '{}') {
      res.status(400).json({ error: 'Missing objectId' })
      return
    }

    const keyExists = await redisService.doesKeyExist(objectId)
    if (!keyExists) {
      res.status(404).json({ error: `Object id doesn't exist` })
      return
    }

    const deleted = await deletePlanFromRedis(objectId)
    handleResponse(res, deleted, 204)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const patchPlan = async (req: Request, res: Response) => {
  try {
    const operations = req.body as Operation[]
    if (!operations) {
      res.status(400).json({ error: 'Missing operations' })
      return
    }

    const { objectId } = req.params
    if (!objectId || objectId === '' || objectId === '{}') {
      res.status(400).json({ error: 'Missing objectId' })
      return
    }

    const etagFromHeader = req.header('If-Match')
    if (!etagFromHeader) {
      res.status(400).json({ error: 'Missing If-Match header' })
      return
    }

    const eTagFromRedis = await redisService.getEtag(objectId)
    if (!eTagFromRedis.ok) {
      return handleResponse(res, eTagFromRedis)
    }

    if (etagFromHeader !== eTagFromRedis.value) {
      res.status(412).setHeader('ETag', eTagFromRedis.value).send({ error: 'ETag does not match' })
      return
    }

    const planFromRedis = await redisService.get<Plan>(objectId)
    if (!planFromRedis.ok) {
      handleResponse(res, planFromRedis)
      return
    }

    const error = validate(operations, planFromRedis.value)
    if (error) {
      res.status(400).json({ error: error })
      return
    }

    const patchedPlan = applyPatch(planFromRedis.value, operations, true)
    const saveResult = await savePlanToRedis(patchedPlan.newDocument, true)
    if (!saveResult.ok) {
      return handleResponse(res, saveResult)
    }

    const [savedPlan, updatedETag] = saveResult.value
    res.status(200).setHeader('ETag', updatedETag).json(savedPlan)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const mergePatchPlan = async (req: Request, res: Response) => {
  try {
    const plan = req.body as Plan
    if (!plan) {
      res.status(400).json({ error: 'Missing operations' })
      return
    }

    const { objectId } = req.params
    if (!objectId || objectId === '' || objectId === '{}') {
      res.status(400).json({ error: 'Missing objectId' })
      return
    }

    const etagFromHeader = req.header('If-Match')
    if (!etagFromHeader) {
      res.status(400).json({ error: 'Missing If-Match header' })
      return
    }

    const eTagFromRedis = await redisService.getEtag(objectId)
    if (!eTagFromRedis.ok) {
      return handleResponse(res, eTagFromRedis)
    }

    if (etagFromHeader !== eTagFromRedis.value) {
      res.status(412).setHeader('ETag', eTagFromRedis.value).send({ error: 'ETag does not match' })
      return
    }

    const planFromRedis = await redisService.get<Plan>(objectId)
    if (!planFromRedis.ok) {
      handleResponse(res, planFromRedis)
      return
    }

    const patchedPlan = jsonmergepatch.apply(planFromRedis.value, plan)

    const result = await jsonParser.validate(patchedPlan, PlanModel)
    if (!result.ok) {
      return handleResponse(res, result)
    }

    const saveResult = await savePlanToRedis(patchedPlan, true)
    if (!saveResult.ok) {
      return handleResponse(res, saveResult)
    }

    const [savedPlan, updatedETag] = saveResult.value
    res.status(200).setHeader('ETag', updatedETag).json(savedPlan)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const patchPlanTemp = async (req: Request, res: Response) => {
  try {
    const plan = req.body as Plan
    if (!plan) {
      res.status(400).json({ error: 'Missing operations' })
      return
    }

    const { objectId } = req.params
    if (!objectId || objectId === '' || objectId === '{}') {
      res.status(400).json({ error: 'Missing objectId' })
      return
    }

    const etagFromHeader = req.header('If-Match')
    if (!etagFromHeader) {
      res.status(400).json({ error: 'Missing If-Match header' })
      return
    }

    const eTagFromRedis = await redisService.getEtag(objectId)
    if (!eTagFromRedis.ok) {
      return handleResponse(res, eTagFromRedis)
    }

    if (etagFromHeader !== eTagFromRedis.value) {
      res.status(412).setHeader('ETag', eTagFromRedis.value).send({ error: 'ETag does not match' })
      return
    }

    const planFromRedis = await redisService.get<Plan>(objectId)
    if (!planFromRedis.ok) {
      handleResponse(res, planFromRedis)
      return
    }

    const existingLinkedPlanServices = planFromRedis.value.linkedPlanServices
    const newLinkedPlanServices = plan.linkedPlanServices
    for (const linkedPlanService of newLinkedPlanServices) {
      const existingLinkedPlanService = existingLinkedPlanServices.find(
        (existing) => existing.objectId === linkedPlanService.objectId
      )
      if (!existingLinkedPlanService) {
        existingLinkedPlanServices.unshift(linkedPlanService)
      } else {
        const existingLinkedPlanServiceIndex = existingLinkedPlanServices.indexOf(existingLinkedPlanService)
        existingLinkedPlanServices[existingLinkedPlanServiceIndex] = linkedPlanService
      }
    }

    const result = await jsonParser.validate(planFromRedis.value, PlanModel)
    if (!result.ok) {
      return handleResponse(res, result)
    }

    const saveResult = await savePlanToRedis(planFromRedis.value, true)
    if (!saveResult.ok) {
      return handleResponse(res, saveResult)
    }

    const [savedPlan, updatedETag] = saveResult.value
    res.status(200).setHeader('ETag', updatedETag).json(savedPlan)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const planService = {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  patchPlan,
  mergePatchPlan,
  patchPlanTemp,
  deletePlan
}

export default planService
