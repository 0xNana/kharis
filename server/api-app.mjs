import express from 'express'
import suiRoutes from './routes/sui.mjs'
import { credentialGuard } from './credential-guard.mjs'

const app = express()
app.use(express.json())
app.use(credentialGuard)
app.use('/api/sui', suiRoutes)

export default app
