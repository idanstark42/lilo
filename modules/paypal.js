const express = require('express')
const paypal = require('@paypal/checkout-server-sdk')

const paypalClient = new paypal.core.PayPalHttpClient(new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_SECRET
))

exports.router = () => {
  const router = express.Router()

  router.post('/create-order', async (req, res) => {
    const { subscriptionPlan } = req.body // subscriptionPlan contains price and duration
  
    const request = new paypal.orders.OrdersCreateRequest()
    request.headers['prefer'] = 'return=representation'
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: subscriptionPlan.price
        }
      }]
    })
  
    try {
      const order = await paypalClient.execute(request)
      res.status(200).json({ success: true, orderId: order.result.id })
    } catch (err) {
      log.error(err)
      res.status(500).json({ success: false, error: 'Failed to create PayPal order' })
    }
  })
  
  // PayPal capture payment handler (Confirm Order)
  router.post('/capture-payment', async (req, res) => {
    const { orderId } = req.body
  
    const request = new paypal.orders.OrdersCaptureRequest(orderId)
    request.requestBody({})
  
    try {
      const capture = await paypalClient.execute(request)
      if (capture.result.status === 'COMPLETED') {
        // Update user subscription in MongoDB
        const db = mongoClient.db()
        const usersCollection = db.collection('users')
  
        const user = await usersCollection.findOne({ email: capture.result.payer.email_address })
        if (user) {
          await usersCollection.updateOne(
            { email: user.email },
            { $set: { subscriptionExpiresAt: new Date(Date.now() + user.subscriptionPlan.duration * 1000) } }
          )
        }
  
        res.status(200).json({ success: true, message: 'Payment successful and subscription updated' })
      } else {
        res.status(400).json({ success: false, error: 'Payment not completed' })
      }
    } catch (err) {
      log.error(err)
      res.status(500).json({ success: false, error: 'Failed to capture payment' })
    }
  })

  return router
}