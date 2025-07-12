import env from '../config/env'
import { Channel, connect } from 'amqplib'
import logger from '../config/logger'
import { ProducerMessage } from '../types/message'

export interface IProducer {
  produce: (message: ProducerMessage[]) => boolean
}

export interface IConsumer {
  consume: (callback: (message: string) => void) => void
}

type RabbitMQClientOptions = {
  url: string
  queueName: string
  connectionTimeout: number
}

export interface IQueueService {
  createProducerClient: () => Promise<IProducer>
  createConsumerClient: () => Promise<IConsumer>
}

class RabbitMQBaseService {
  protected channel: Channel
  protected options: RabbitMQClientOptions

  protected constructor(channel: Channel, options: RabbitMQClientOptions) {
    this.channel = channel
    this.options = options
  }

  protected static async createChannel(options: RabbitMQClientOptions): Promise<Channel> {
    const { url, queueName, connectionTimeout } = options
    const connection = await connect(url, { timeout: connectionTimeout })
    const channel = await connection.createChannel()
    channel.assertQueue(queueName)
    return channel
  }
}

class RabbitMQProducerService extends RabbitMQBaseService implements IProducer {
  produce = (message: string | object): boolean => {
    logger.info(`Producing message`)
    const result = this.channel.sendToQueue(this.options.queueName, Buffer.from(JSON.stringify(message)))
    logger.info(`Producing message result: ${result}`)
    return result
  }

  static async create(options: RabbitMQClientOptions): Promise<IProducer> {
    const channel = await this.createChannel(options)
    return new RabbitMQProducerService(channel, options)
  }
}

class RabbitMQConsumerService extends RabbitMQBaseService implements IConsumer {
  consume = async (callback: (message: string) => void) => {
    this.channel.consume(this.options.queueName, (message) => {
      logger.info(`Consuming message. Has data: ${message ? true : false}`)
      if (message) {
        try {
          logger.info(`Invoking consumer callback`)
          callback(message.content.toString())
          logger.info(`Acking message`)
          this.channel.ack(message)
        } catch (e) {
          logger.error(`Error consuming message: ${e}`)
          logger.error(e)
          this.channel.nack(message)
        }
      }
    })
  }

  static async create(options: RabbitMQClientOptions): Promise<IConsumer> {
    const channel = await this.createChannel(options)
    return new RabbitMQConsumerService(channel, options)
  }
}

class RabbitMQQueueService implements IQueueService {
  options: RabbitMQClientOptions
  constructor(options: RabbitMQClientOptions) {
    this.options = options
  }
  createProducerClient = (): Promise<IProducer> => RabbitMQProducerService.create(this.options)
  createConsumerClient = (): Promise<IConsumer> => RabbitMQConsumerService.create(this.options)
}

const QueueServiceFactory = {
  create: (): IQueueService => {
    const options = {
      url: env.getOrDefault('RABBITMQ_URL', 'amqp://localhost'),
      queueName: env.getOrDefault('RABBITMQ_QUEUE_NAME', 'elastic-search-queue'),
      connectionTimeout: parseInt(env.getOrDefault('RABBITMQ_CONNECTION_TIMEOUT', '2000'))
    }
    return new RabbitMQQueueService(options)
  }
}

export default QueueServiceFactory
