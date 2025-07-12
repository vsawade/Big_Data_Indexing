import env from '../config/env'
import { Client } from '@elastic/elasticsearch'
import logger from '../config/logger'
import { IndexRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey'

type ElasticSearchClientOptions = {
  url: string
  index: string
}

export interface IElasticSearchService {
  setupIndex(mappings: object): Promise<boolean>
  create<T>(objectId: string, object: T): Promise<boolean>
  delete(objectId: string): Promise<boolean>
}

class ElasticSearchService implements IElasticSearchService {
  options: ElasticSearchClientOptions
  client: Client

  constructor(options: ElasticSearchClientOptions) {
    this.options = options
    this.client = new Client({
      node: this.options.url
    })
  }

  async setupIndex(mappings: object): Promise<boolean> {
    logger.info(`Setting up index ${this.options.index} in ElasticSearch`)
    const exists = await this.client.indices.exists({ index: this.options.index })
    if (!exists) {
      logger.info(`Creating index ${this.options.index} in ElasticSearch`)
      await this.client.indices.create({ index: this.options.index, mappings: mappings })
    }
    return true
  }

  async create<T>(objectId: string, object: T): Promise<boolean> {
    logger.info(`Creating object ${objectId} in ElasticSearch`)
    const req: IndexRequest<T> = {
      index: this.options.index,
      id: objectId,
      body: object,
      routing: '1'
    }
    try {
      const response = await this.client.index<T>(req)
      return response.result === 'created' || 'updated' === response.result
    } catch (err) {
      logger.error(`Error creating object ${objectId} in ElasticSearch, ${err}`)
      return false
    }
  }

  async delete(objectId: string): Promise<boolean> {
    logger.info(`Deleting object ${objectId} in ElasticSearch`)
    try {
      const response = await this.client.delete({
        index: this.options.index,
        id: objectId
      })
      return response.result === 'deleted'
    } catch (err) {
      logger.error(`Error deleting object ${objectId} in ElasticSearch, ${err}`)
    }
    return false
  }
}

const ElasticSearchServiceFactory = {
  create: (): IElasticSearchService => {
    const options = {
      url: env.getOrDefault('ELASTIC_SEARCH_URL', 'http://localhost:9200'),
      index: env.getOrDefault('ELASTIC_SEARCH_INDEX', 'indexplan')
    }
    return new ElasticSearchService(options)
  }
}

export default ElasticSearchServiceFactory
