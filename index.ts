import fastify from 'fastify'
import authPlugin from 'fastify-auth'
import bearerAuthPlugin from 'fastify-bearer-auth'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import { DateTime } from 'luxon';
import data from './data.json'

const prisma = new PrismaClient()
dotenv.config()

const passphrases: string = process.env['PASSPHRASES']!
const mode = Number(process.env['MODE'])
const consecutive = Boolean(Number(process.env['CONSECUTIVE']))
const days = mode == 0 ? 7 : 28
const currentDate = DateTime.local()
const startOfCurrentDate = DateTime.local().startOf('day')
const endOfCurrentDate = DateTime.local().endOf('day')
const startOfMonth = DateTime.local().startOf('month')
const endOfMonth = DateTime.local().endOf('month');
const startOfWeek = DateTime.local().startOf('week').minus({days:1})
const endOfWeek = DateTime.local().endOf('week').minus({days:1})
const currentDayOfWeek = DateTime.local().weekday
const cycleStart = mode == 0 ? startOfWeek : startOfMonth
const cycleEnd = mode == 0 ? endOfWeek : endOfMonth

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
        keys: JSON.parse(passphrases),
        addHook: false,
    })
    .after(() => {

        server.get('/:earnerId', async (request, reply) => {
            const params : any = request.params
            const earnerId = params.earnerId
            // Get reward list and earn state
            const entries = await prisma.givenRewards.findMany({
                where: {
                    earnerId: earnerId,
                    OR: [{
                        createdAt: {
                            gte: cycleStart.toJSDate(),
                            lte: cycleEnd.toJSDate()
                        }
                    }],
                },
                orderBy: [{
                    createdAt: 'asc'
                }]
            })
            const count = entries.length
            const result : any[] = []
            let claimableDate = cycleStart
            let foundClaimableEntry = false
            for (let i = 0; i < rewards.length; i++) {
                const reward = rewards[i]
                let isClaimed = false
                if (!consecutive) {
                    for (let j = 0; j < entries.length; j++) {
                        if (entries[j].createdAt.getTime() >= startOfCurrentDate.toJSDate().getTime() &&
                            entries[j].createdAt.getTime() <= endOfCurrentDate.toJSDate().getTime() &&
                            entries[j].createdAt.getTime() >= claimableDate.toJSDate().getTime() &&
                            entries[j].createdAt.getTime() <= claimableDate.plus({days:1}).toJSDate().getTime())
                        {
                            isClaimed = true
                            break;
                        }
                    }
                } else {
                    isClaimed = i < count
                }
                let canClaim = false
                if (!isClaimed) {
                    if (count > 0) {
                        canClaim = entries[entries.length - 1].createdAt.getTime() < startOfCurrentDate.toJSDate().getTime()
                    } else {
                        canClaim = true
                    }
                    if (!consecutive) {
                        canClaim = canClaim && currentDate.toJSDate().getTime() >= claimableDate.toJSDate().getTime()
                        canClaim = canClaim && currentDate.toJSDate().getTime() <= claimableDate.plus({days:1}).toJSDate().getTime()
                    } else {
                        canClaim = canClaim && !foundClaimableEntry
                    }
                    if (!foundClaimableEntry) {
                        foundClaimableEntry = canClaim
                    }
                }
                result.push({
                    isClaimed: isClaimed,
                    canClaim: canClaim,
                    reward: reward
                })
                claimableDate = claimableDate.plus({days:1})
            }
            reply.code(200).send(result)
        })

        server.post('/claim/:earnerId', {
            preHandler: server.auth([
                server.verifyBearerAuth!
            ]),
        }, async (request, reply) => {
            // Claim reward
        })
    })


server.listen(Number(process.env['PORT']), (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
})