import { PrismaClient } from '@prisma/client'
import { IClaimableRewards } from '../interfaces'

export default {
    sendRewards: async function(prisma : PrismaClient, IClaimableRewards : any) : Promise<boolean> {
        // NOTE: Fork this repository and modify this function to send rewards
        return false
    }
}