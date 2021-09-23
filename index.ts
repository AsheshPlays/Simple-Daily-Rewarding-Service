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

function getCurrentDate() {
    return DateTime.local()
}

function getStartOfMonth() {
    return DateTime.local().startOf('month')
}

function getEndOfMonth() {
    return DateTime.local().endOf('month')
}

function getStartOfWeek() {
    return DateTime.local().startOf('week')
}

function getEndOfWeek() {
    return DateTime.local().endOf('week')
}

function getCycleStart() {
    return mode == 0 ? getStartOfWeek() : getStartOfMonth()
}

function getCycleEnd() {
    return mode == 0 ? getEndOfWeek() : getEndOfMonth()
}

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
            const currentDate = getCurrentDate()
            const cycleStart = getCycleStart()
            const cycleEnd = getCycleEnd()
            const offset = currentDate.offset
            // Get reward list and earn state
            const claimableRewards = await utils.getClaimableRewards(prisma, currentDate, cycleStart, cycleEnd, rewards, consecutive, earnerId)
            reply.code(200).send({
                rewards: claimableRewards,
                currentDate: currentDate.toJSDate().getTime(),
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
            const currentDate = getCurrentDate()
            const cycleStart = getCycleStart()
            const cycleEnd = getCycleEnd()
            // Claim reward
            const claimableRewards = await utils.getClaimableRewards(prisma, currentDate, cycleStart, cycleEnd, rewards, consecutive, earnerId)
            for (let i = 0; i < claimableRewards.length; i++) {
                const element = claimableRewards[i]
                if (element.canClaim) {
                    // Send rewards
                    if (await functions.sendRewards(prisma, element, earnerId)) {
                        // Success, send items
                        await prisma.givenRewards.create({
                            data: {
                                earnerId: earnerId,
                                createdAt: currentDate.toJSDate()
                            }
                        })
                        reply.code(200).send(element.reward);
                        return;
                    } else {
                        // Internal error occurs when send rewards
                        reply.code(500).send();
                        return;
                    }
                }
            }
            // No rewards found
            reply.code(404).send();
        })
    })


server.listen(Number(process.env['PORT']), String(process.env['ADDRESS']), (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
})