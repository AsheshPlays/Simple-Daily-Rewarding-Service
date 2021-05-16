import fastify from 'fastify'
import authPlugin from 'fastify-auth'
import bearerAuthPlugin from 'fastify-bearer-auth'
import { PrismaClient } from '@prisma/client'
import * as dotenv from "dotenv"

const prisma = new PrismaClient()
dotenv.config()

const passphrases: string = process.env['PASSPHRASES']!

const server = fastify()
    .register(authPlugin)
    .register(bearerAuthPlugin, {
        keys: JSON.parse(passphrases),
        addHook: false,
    })
    .after(() => {

        
    })


server.listen(Number(process.env['PORT']), (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
})