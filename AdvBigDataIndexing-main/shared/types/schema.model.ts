export type SchemaModel = ObjectSchema | ArraySchema | StringSchema | NumberSchema
export enum SchemaTypeEnum {
  OBJECT = 'object',
  ARRAY = 'array',
  STRING = 'string',
  NUMBER = 'number'
}

export interface ObjectSchema {
  type: 'object'
  properties: Properties
  $schema?: string
  title?: string
  additionalProperties?: boolean
  required?: string[]
}

export interface ArraySchema {
  type: 'array'
  items: SchemaModel
}

export interface StringSchema {
  type: 'string'
}

export interface NumberSchema {
  type: 'number'
}

export interface Properties {
  [key: string]: SchemaModel
}
