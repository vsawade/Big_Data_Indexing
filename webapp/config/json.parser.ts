import ajv from 'ajv'
import errors, { HttpStatusError } from '../utils/errors'
import { Err, Ok, Result } from '../../shared/utils/result'
import { Model } from '../../shared/types/model'
import { SchemaModel } from '../../shared/types/schema.model'

const Ajv = new ajv({
  allErrors: true
})

const getSchema = async (model: Model): Promise<Result<SchemaModel, HttpStatusError>> => {
  const jsonSchema = await model.schema()
  let jsonSchemeObj: SchemaModel
  if (!jsonSchema) {
    if (!model.fallbackSchema) return Err(errors.validationError('Schema invalid or not found for key: ' + model.key))
    jsonSchemeObj = model.fallbackSchema
  } else {
    jsonSchemeObj = JSON.parse(jsonSchema)
  }
  return Ok(jsonSchemeObj)
}

const validate = async (json: unknown, model: Model): Promise<Result<boolean, HttpStatusError>> => {
  const jsonSchemeResult = await getSchema(model)
  if (!jsonSchemeResult.ok) return jsonSchemeResult
  const jsonSchemeObj = jsonSchemeResult.value
  const validate = Ajv.compile(jsonSchemeObj)
  const valid = validate(json)
  if (!valid) {
    return Err(errors.validationError(validate.errors))
  }
  return Ok(true)
}

const jsonParser = {
  getSchema,
  validate
}

export default jsonParser
