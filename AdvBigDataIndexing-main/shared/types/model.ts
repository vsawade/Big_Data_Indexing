import { SchemaModel } from './schema.model'

export type Model = {
  fallbackSchema?: SchemaModel
  schema: () => Promise<string | null>
  fallbackElasticMappings?: object
  elasticMappings: () => Promise<string | null>
  key: string
}
