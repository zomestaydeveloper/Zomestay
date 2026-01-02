module.exports = (app) => {
  app.use('/webhooks', require('./webhooks/razorpay.routes'));

  app.use('/', require('./adminRoutes/auth.routes'));
  app.use('/', require('./adminRoutes/property.routes'));
  app.use('/', require('./adminRoutes/host.routes'));
  app.use('/', require('./adminRoutes/avalibility.routes'));
  app.use('/', require('./adminRoutes/specialRate.routes'));
  app.use('/', require('./adminRoutes/mealPlan.routes'));
  app.use('/', require('./adminRoutes/frontdesk.routes'));
  app.use('/', require('./adminRoutes/propertyRoomTypes.routes'));
  app.use('/', require('./adminRoutes/propertycreation.routes'));
  app.use('/', require('./adminRoutes/rateCalendar.routes'));
  app.use('/', require('./adminRoutes/cancellationPolicy.routes'));
  app.use('/', require('./adminRoutes/guests.routes'));
  app.use('/', require('./adminRoutes/payments.routes'));

  app.use('/api', require('./userRoutes/auth.routes'));
  app.use('/api', require('./userRoutes/userDetails.routes'));
  app.use('/api', require('./userRoutes/payment.routes'));
  app.use('/api', require('./userRoutes/rooms.routes'));
  app.use('/api/search', require('./userRoutes/propertySearch.routes'));
  app.use('/api/callback-requests', require('./userRoutes/requestCallback.routes'));
  app.use('/', require('./userRoutes/propertyDetials.routes'));

  app.use('/api', require('./agentRoutes/auth.routes'));
  app.use('/api/travel-agents', require('./agentRoutes/travelAgent.routes'));
  app.use('/api/properties-for-agent', require('./agentRoutes/propertyForAgent.routes'));
  app.use('/api/agent-discounts', require('./agentRoutes/agentPropertyDiscount.routes'));

  app.use('/api', require('./reviewRoutes/review.routes'));
  app.use('/api', require('./cancellationRequestRoutes/cancellationRequest.routes'));
};
