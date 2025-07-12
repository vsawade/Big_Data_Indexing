export type DataRecordParent = {
  objectType: string
  objectId: string
  objectKey: string
}

export type DataRecord = {
  objectId: string
  objectType: string
  value: object | null
  parent?: DataRecordParent | null
}

export enum ProducerOperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

export type ProducerMessage = {
  operation: ProducerOperationType
  object: Array<DataRecord>
}
