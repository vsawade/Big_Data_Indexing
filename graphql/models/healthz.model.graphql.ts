import { GraphQLError, GraphQLObjectType, GraphQLString } from 'graphql'
import database from '../../shared/config/database'

const HealthzQueryRoot = new GraphQLObjectType({
  name: 'HealthzQueryRoot',
  fields: () => ({
    healthz: {
      type: GraphQLString,
      resolve: async () => {
        try {
          const result = await database.getDatabaseConnection().ping()
          if (result == 'PONG') {
            return 'Healthy'
          }
          throw new Error('Database connection error')
        } catch (error) {
          throw new GraphQLError(error.message, {
            extensions: { http: { status: 503 } }
          })
        }
      }
    }
  })
})

export default HealthzQueryRoot
