import Fastify from 'fastify'

const app = Fastify({
  logger: true,
})

app.get('/', async (req, reply) => {
  return reply.status(200).type('application/json').send({message: 'Welcome to the API for tech writers workshop'})
})

export default async function handler(req, reply) {
  await app.ready()
  app.server.emit('request', req, reply)
}
