import { PrismaClient } from '@prisma/client'
import { IClaimableRewards } from '../interfaces'

export default {
    sendRewards: async function(prisma : PrismaClient, claimableRewards : IClaimableRewards) : Promise<boolean> {
        // NOTE: Fork this repository and modify this function to send rewards
        return true
    }
}