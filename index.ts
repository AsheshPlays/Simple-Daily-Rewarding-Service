import fastify from 'fastify'
import authPlugin from 'fastify-auth'
import bearerAuthPlugin from 'fastify-bearer-auth'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import { DateTime } from 'luxon';
import utils from './utils'
import functions from './functions'
import data from './data.json'

const prisma = new PrismaClient()
dotenv.config()

const secretKeys: string = process.env['SECRET_KEYS']!
const mode = Number(process.env['MODE'])
const consecutive = Boolean(Number(process.env['CONSECUTIVE']))
const days = mode == 0 ? 7 : 28
const currentDate = DateTime.local()
const startOfMonth = DateTime.local().startOf('month')
const endOfMonth = DateTime.local().endOf('month')
const startOfWeek = DateTime.local().startOf('week')
const endOfWeek = DateTime.local().endOf('week')
const cycleStart = mode == 0 ? startOfWeek : startOfMonth
const cycleEnd = mode == 0 ? endOfWeek : endOfMonth
const offset = currentDate.offset

const rewards : any[] = []
let j = 0
for (let i = 0; i < days; ++i) {
    if (j < data.length) {
        rewards.push(data[j])
    }
    if (j + 1 >= data.length) {
        j = 0
    } else {
        j++
    }
}

const server = fastify()
    .register(authPlugin)
    .register(bearerAuthPlugin, {
        keys: JSON.parse(secretKeys),
        addHook: false,
    })
    .after(() => {

        server.get('/:earnerId', async (request, reply) => {
            const params : any = request.params
            const earnerId = params.earnerId
            // Get reward list and earn state
            const claimableRewards = await utils.getClaimableRewards(prisma, currentDate, cycleStart, cycleEnd, rewards, consecutive, earnerId)
            reply.code(200).send({
                rewards: claimableRewards,
                cycleStart: cycleStart.toJSDate().getTime(),
                cycleEnd: cycleEnd.toJSDate().getTime(),
                offset: offset
            })
        })

        server.post('/claim/:earnerId', {
            preHandler: server.auth([
                server.verifyBearerAuth!
            ]),
        }, async (request, reply) => {
            const params : any = request.params
            const earnerId = params.earnerId
            // Claim reward
            const claimableRewards = await utils.getClaimableRewards(prisma, currentDate, cycleStart, cycleEnd, rewards, consecutive, earnerId)
            for (let i = 0; i < claimableRewards.length; i++) {
                const element = claimableRewards[i]
                if (element.canClaim) {
                    // Send rewards
                    if (functions.sendRewards(prisma, element, earnerId)) {
                        // Success, send items
                        await prisma.givenRewards.create({
                            data: {
                                earnerId: earnerId,
                                createdAt: currentDate.toJSDate()
                            }
                        })
                        reply.code(200).send(element.reward);
                    } else {
                        // Internal error occurs when send rewards
                        reply.code(500).send();
                    }
                    break;
                }
            }
            // No rewards found
            reply.code(404).send();
        })
    })


server.listen(Number(process.env['PORT']), (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
})