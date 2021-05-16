import fastify from 'fastify'
import authPlugin from 'fastify-auth'
import bearerAuthPlugin from 'fastify-bearer-auth'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import dateUtils from './utils/date'
import data from './data.json'

const prisma = new PrismaClient()
dotenv.config()

const passphrases: string = process.env['PASSPHRASES']!
const mode = Number(process.env['MODE'])
const days = mode == 0 ? 7 : 28
const currentDate = new Date()
const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth())
const firstDayOfWeek = dateUtils.getMonday(currentDate)

const rewards = []
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

        server.get('/:ownerId', async (request, reply) => {
            // Get reward list and earn state
        })

        server.post('/claim/:ownerId', {
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