/* eslint-disable @typescript-eslint/no-explicit-any */
import { GraphQLFieldConfigMap, GraphQLObjectType, GraphQLSchema } from 'graphql'
import PlanQueryRoot from './plan.model.graphql'
import HealthzQueryRoot from './healthz.model.graphql'

const combineQueries = (queries: GraphQLObjectType[]): GraphQLObjectType => {
  const mergedFields = queries.reduce(
    (acc, query) => {
      const fields = query.toConfig().fields
      for (const key in fields) {
        const value = fields[key]
        if (value !== undefined) acc[key] = value
      }
      return acc
    },
    {} as GraphQLFieldConfigMap<any, any>
  )
  return new GraphQLObjectType({ name: 'Query', fields: mergedFields })
}

const schema = new GraphQLSchema({
  query: combineQueries([PlanQueryRoot, HealthzQueryRoot])
})

export default schema
