# Communication Templates

This directory contains email and SMS template services for consistent messaging across the application.

## Email Templates (`emailTemplate.service.js`)

All email templates return **HTML content** with professional styling and ZomesStay branding.

### Available Templates:

1. **`otp`** - OTP verification email
2. **`bookingConfirmation`** - Booking confirmation email
3. **`paymentFailed`** - Payment failure notification
4. **`cancellationRequestSubmitted`** - Cancellation request acknowledgment
5. **`cancellationApproved`** - Cancellation approval notification
6. **`cancellationRejected`** - Cancellation rejection notification
7. **`bookingNotificationToHost`** - New booking notification to property owner
8. **`adminCancellationRequestNotification`** - Cancellation request notification to admin

### Usage Example:

```javascript
const { emailTemplates, emailService } = require('../../services/communication');

// Generate HTML email content
const emailContent = emailTemplates.bookingConfirmation({
  bookingNumber: 'BK123456',
  guestName: 'John Doe',
  propertyName: 'Sunset Villa',
  propertyAddress: '123 Beach Road, Goa',
  checkIn: '2024-12-25',
  checkOut: '2024-12-28',
  nights: 3,
  guests: 2,
  children: 0,
  totalAmount: 15000,
  roomDetails: [
    {
      roomTypeName: 'Deluxe Room',
      rooms: 1,
      mealPlan: 'Breakfast',
      price: 15000
    }
  ],
  paymentMethod: 'Online Payment'
});

// Send email
await emailService.send({
  to: 'user@example.com',
  subject: 'Booking Confirmation - ZomesStay',
  content: emailContent
});
```

---

## SMS Templates (`smsTemplate.service.js`)

All SMS templates return **plain text messages** optimized for SMS (concise, clear, under 160 characters when possible).

### Available Templates:

1. **`otp`** - OTP verification SMS
2. **`bookingConfirmation`** - Booking confirmation SMS
3. **`paymentFailed`** - Payment failure notification
4. **`cancellationRequestSubmitted`** - Cancellation request acknowledgment
5. **`cancellationApproved`** - Cancellation approval notification
6. **`cancellationRejected`** - Cancellation rejection notification
7. **`bookingNotificationToHost`** - New booking notification to property owner
8. **`adminCancellationRequestNotification`** - Cancellation request notification to admin
9. **`bookingCancelled`** - Booking cancelled notification
10. **`bookingCompleted`** - Booking completed notification

### Usage Example:

```javascript
const { smsTemplates, smsService } = require('../../services/communication');

// Generate SMS message
const smsMessage = smsTemplates.bookingConfirmation({
  bookingNumber: 'BK123456',
  guestName: 'John Doe',
  propertyName: 'Sunset Villa',
  checkIn: '2024-12-25',
  checkOut: '2024-12-28',
  totalAmount: 15000
});

// Send SMS
await smsService.send({
  to: '+919876543210',
  message: smsMessage
});
```

---

## Template Features

### Email Templates:
- ✅ Professional HTML design with ZomesStay branding
- ✅ Responsive design (mobile-friendly)
- ✅ Consistent styling and colors
- ✅ Support for tables, buttons, info boxes
- ✅ Automatic date and currency formatting
- ✅ Footer with company information

### SMS Templates:
- ✅ Concise and clear messages
- ✅ Optimized for SMS length
- ✅ Automatic date and currency formatting
- ✅ Phone number formatting helper
- ✅ Consistent message structure

---

## Adding New Templates

### To add a new email template:

1. Add function to `emailTemplate.service.js`:
```javascript
newTemplate: (data) => {
  const content = `
    <h2>Your Title</h2>
    <p>Your content here...</p>
  `;
  return getBaseEmailTemplate(content, 'Email Title - ZomesStay');
}
```

2. Use in controllers:
```javascript
const emailContent = emailTemplates.newTemplate({ ...data });
await emailService.send({ to, subject, content: emailContent });
```

### To add a new SMS template:

1. Add function to `smsTemplate.service.js`:
```javascript
newTemplate: (data) => {
  return `Your SMS message here with ${data.variable}`;
}
```

2. Use in controllers:
```javascript
const smsMessage = smsTemplates.newTemplate({ ...data });
await smsService.send({ to, message: smsMessage });
```

---

## Best Practices

1. **Always use templates** - Don't create HTML/text manually
2. **Handle errors gracefully** - Wrap template calls in try-catch
3. **Log failures** - Log when SMS/Email sending fails but don't fail main operation
4. **Test templates** - Test all templates with real data before production
5. **Keep messages concise** - SMS should be under 160 characters when possible
6. **Use consistent formatting** - Follow existing template patterns

---

## Testing Templates

You can test templates locally:

```javascript
const { emailTemplates, smsTemplates } = require('./templates');

// Test email template
const emailHTML = emailTemplates.otp({ otp: '1234', userName: 'Test User' });
console.log(emailHTML); // View HTML output

// Test SMS template
const smsText = smsTemplates.otp({ otp: '1234', expiresIn: 5 });
console.log(smsText); // View SMS text
```

