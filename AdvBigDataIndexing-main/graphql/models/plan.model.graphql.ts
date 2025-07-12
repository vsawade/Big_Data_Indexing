import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLList, GraphQLFloat } from 'graphql'
import PlanModel from '../../shared/models/plan.model'
import redisGraphQLService from '../services/redis.graphql.service'
import keyUtils from '../../shared/utils/key-utils'

const PlanType = new GraphQLObjectType({
  name: 'plan',
  description: 'Plan',
  fields: () => ({
    planCostShares: {
      type: PlanCostSharesType,
      resolve: async (parent) => {
        const redisKey = parent.planCostShares
        return redisGraphQLService.resolveKey(redisKey)
      }
    },
    linkedPlanServices: {
      type: new GraphQLList(LinkedPlanServiceType),
      resolve: async (parent) => {
        const redisKeys = parent.linkedPlanServices
        return redisGraphQLService.resolveKeys(redisKeys)
      }
    },
    _org: { type: GraphQLString },
    objectId: { type: GraphQLID },
    objectType: { type: GraphQLString },
    planType: { type: GraphQLString },
    creationDate: { type: GraphQLString }
  })
})

const PlanCostSharesType = new GraphQLObjectType({
  name: 'planCostShares',
  fields: () => ({
    deductible: { type: GraphQLFloat },
    _org: { type: GraphQLString },
    copay: { type: GraphQLFloat },
    objectId: { type: GraphQLID },
    objectType: { type: GraphQLString }
  })
})

const LinkedPlanServiceType = new GraphQLObjectType({
  name: 'linkedPlanService',
  fields: () => ({
    linkedService: {
      type: LinkedServiceType,
      resolve: async (parent) => {
        const redisKey = parent.linkedService
        return redisGraphQLService.resolveKey(redisKey)
      }
    },
    planserviceCostShares: {
      type: PlanServiceCostSharesType,
      resolve: async (parent) => {
        const redisKey = parent.planserviceCostShares
        return redisGraphQLService.resolveKey(redisKey)
      }
    },
    _org: { type: GraphQLString },
    objectId: { type: GraphQLID },
    objectType: { type: GraphQLString }
  })
})

const LinkedServiceType = new GraphQLObjectType({
  name: 'linkedService',
  fields: () => ({
    _org: { type: GraphQLString },
    objectId: { type: GraphQLID },
    objectType: { type: GraphQLString },
    name: { type: GraphQLString }
  })
})

const PlanServiceCostSharesType = new GraphQLObjectType({
  name: 'planServiceCostShares',
  fields: () => ({
    deductible: { type: GraphQLFloat },
    _org: { type: GraphQLString },
    copay: { type: GraphQLFloat },
    objectId: { type: GraphQLID },
    objectType: { type: GraphQLString }
  })
})

const PlanQueryRoot = new GraphQLObjectType({
  name: 'PlanQueryRoot',
  fields: {
    plans: {
      type: new GraphQLList(PlanType),
      resolve: async () => {
        const keys = await redisGraphQLService.getKeys(PlanModel.key)
        return redisGraphQLService.resolveKeys(keys)
      }
    },
    plan: {
      type: PlanType,
      args: { id: { type: GraphQLID } },
      resolve: async (_, args) => {
        if (!args.id) throw new Error('No id provided')
        const redisKey = keyUtils.getKey(args.id, PlanModel.key)
        return redisGraphQLService.resolveKey(redisKey)
      }
    }
  }
})

export default PlanQueryRoot
