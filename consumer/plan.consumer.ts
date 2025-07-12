import env from '../shared/config/env'
import ElasticSearchServiceFactory from '../shared/services/elastic.service'
import QueueServiceFactory from '../shared/services/queue.service'
import logger from '../shared/config/logger'
import { DataRecord, ProducerMessage, ProducerOperationType } from '../shared/types/message'
import elasticParser from '../shared/config/elastic.parser'
import PlanModel from '../shared/models/plan.model'

// Setup .env file
env.loadEnv()

const queueService = QueueServiceFactory.create()
const elasticService = ElasticSearchServiceFactory.create()

const handleElasticSearchCreate = async (data: DataRecord) => {
  const joinObject = elasticParser.convertToElasticJoinObject(data, 'plan_join')
  console.log(JSON.stringify(joinObject, null, 2))
  const result = await elasticService.create(joinObject.objectId, joinObject.object)
  logger.info(`Created object in ElasticSearch with id ${result}`)
}

const executeElasticSearchOperation = async (data: ProducerMessage) => {
  for (let i = 0; i < data.object.length; i++) {
    const eachRecord = data.object[i]
    if (!eachRecord) continue
    try {
      switch (data.operation) {
        case ProducerOperationType.CREATE:
        case ProducerOperationType.UPDATE: // Implement update operation
          await handleElasticSearchCreate(eachRecord)
          break
        case ProducerOperationType.DELETE:
          await elasticService.delete(eachRecord.objectId)
          break
      }
    } catch (err) {
      logger.error(`Error executing operation ${data.operation}`)
    }
  }
}

const execute = async () => {
  const mappings = await elasticParser.getMappings(PlanModel)
  if (!mappings.ok) {
    logger.error(`Failed to get mappings from model`)
    return
  }
  const indexCreation = await elasticService.setupIndex(mappings.value)
  if (!indexCreation) {
    logger.error(`Failed to setup index in ElasticSearch`)
    return
  }

  const consumerClient = await queueService.createConsumerClient()
  consumerClient.consume(async (message) => {
    logger.info(`Recieved message from consumer queue`)
    const data = JSON.parse(message.toString()) as ProducerMessage[]
    for (let i = 0; i < data.length; i++) {
      const eachMessage = data[i]
      if (!eachMessage) continue
      logger.info(`Parsed message. Executing operation ${eachMessage.operation} on object`)
      await executeElasticSearchOperation(eachMessage)
    }
  })
}

execute()
