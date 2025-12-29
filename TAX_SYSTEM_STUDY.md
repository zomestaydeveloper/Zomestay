# Indian Tax System Study - GST for Hospitality/Property Bookings

## Overview
This document provides a comprehensive understanding of the Indian tax system, specifically focusing on GST (Goods and Services Tax) components relevant to property/hospitality bookings.

---

## 1. GST (Goods and Services Tax) - Introduction

**GST** is a unified indirect tax system introduced in India on July 1, 2017, replacing multiple indirect taxes like VAT, Service Tax, Excise Duty, etc.

### Key Characteristics:
- **Single Tax System**: One tax replaces multiple taxes
- **Destination-Based**: Tax is collected at the point of consumption
- **Dual Structure**: Both Central and State governments collect GST

---

## 2. Components of GST

### 2.1 CGST (Central Goods and Services Tax)
- **Full Form**: Central Goods and Services Tax
- **Collected By**: Central Government
- **Applies To**: Intra-state transactions (within the same state)
- **Purpose**: Replaces Central Excise Duty, Service Tax, etc.

### 2.2 SGST (State Goods and Services Tax)
- **Full Form**: State Goods and Services Tax
- **Collected By**: State Government
- **Applies To**: Intra-state transactions (within the same state)
- **Purpose**: Replaces State VAT, Luxury Tax, Entertainment Tax, etc.

### 2.3 IGST (Integrated Goods and Services Tax)
- **Full Form**: Integrated Goods and Services Tax
- **Collected By**: Central Government (distributed to states)
- **Applies To**: Inter-state transactions (between different states)
- **Purpose**: Ensures seamless tax credit flow across states

### 2.4 CESS (Cess)
- **Full Form**: Cess (additional tax)
- **Collected By**: Central Government
- **Applies To**: Specific goods/services (luxury items, certain services)
- **Purpose**: Additional tax for specific purposes (e.g., Swachh Bharat Cess, Krishi Kalyan Cess)
- **Note**: CESS is calculated on the base amount (before GST)

---

## 3. Tax Structure for Hospitality/Property Bookings

### 3.1 GST Rates for Accommodation Services

| Property Type | GST Rate | CGST | SGST | IGST |
|--------------|----------|------|------|------|
| **Room Tariff ≤ ₹999/day** | 0% | 0% | 0% | 0% |
| **Room Tariff ₹1,000 - ₹7,499/day** | 5% | 2.5% | 2.5% | 5% |
| **Room Tariff ≥ ₹7,500/day** | 18% | 9% | 9% | 18% |

### 3.2 Additional Taxes/CESS

#### Swachh Bharat Cess (SBC)
- **Rate**: 0.5% (on taxable services)
- **Status**: Merged into GST (no longer separate)

#### Krishi Kalyan Cess (KKC)
- **Rate**: 0.5% (on taxable services)
- **Status**: Merged into GST (no longer separate)

#### Luxury Tax (Pre-GST)
- **Status**: Replaced by GST
- **Note**: Higher GST rates (18%) apply to luxury accommodations

---

## 4. Tax Calculation Logic

### 4.1 Intra-State Transaction (Same State)
**Example**: Guest from Mumbai books property in Mumbai

```
Base Amount: ₹5,000
GST Rate: 12%
CGST: ₹5,000 × 6% = ₹300
SGST: ₹5,000 × 6% = ₹300
Total Tax: ₹600
Total Amount: ₹5,600
```

### 4.2 Inter-State Transaction (Different States)
**Example**: Guest from Delhi books property in Mumbai

```
Base Amount: ₹5,000
GST Rate: 12%
IGST: ₹5,000 × 12% = ₹600
Total Tax: ₹600
Total Amount: ₹5,600
```

### 4.3 With CESS (if applicable)
**Example**: Luxury property booking

```
Base Amount: ₹10,000
GST Rate: 18%
IGST: ₹10,000 × 18% = ₹1,800
CESS (if applicable): ₹10,000 × 1% = ₹100
Total Tax: ₹1,900
Total Amount: ₹11,900
```

---

## 5. Determining Tax Type (CGST+SGST vs IGST)

### Rules:
1. **Same State**: 
   - Property location state = Guest billing state
   - **Use**: CGST + SGST

2. **Different States**:
   - Property location state ≠ Guest billing state
   - **Use**: IGST

3. **Union Territories**:
   - Similar to states, but SGST is replaced by UTGST (Union Territory GST)
   - Inter-state with UT: IGST applies

---

## 6. Tax on Different Components

### 6.1 Room Rent
- **Taxable**: Yes
- **Rate**: Based on tariff (0%, 12%, or 18%)

### 6.2 Food & Beverages
- **Taxable**: Yes
- **Rate**: 5% (if separate from accommodation) or included in room rate

### 6.3 Extra Services
- **Laundry**: 18% GST
- **Spa Services**: 18% GST
- **Transportation**: 5% GST (if provided separately)

### 6.4 Cancellation Charges
- **Taxable**: Yes
- **Rate**: Same as accommodation rate

---

## 7. Input Tax Credit (ITC)

### Concept:
- Businesses can claim credit for GST paid on inputs
- Reduces tax liability

### For Property Owners:
- Can claim ITC on:
  - Property maintenance
  - Supplies
  - Services purchased
- Cannot claim ITC on:
  - Personal expenses
  - Exempt supplies

---

## 8. Implementation Considerations for Property Booking System

### 8.1 Data Fields Needed

```javascript
{
  // Base pricing
  baseAmount: Decimal,
  
  // Tax configuration per property
  taxConfig: {
    gstRate: Decimal,        // 0, 12, or 18
    cgstRate: Decimal,       // 0, 6, or 9 (for intra-state)
    sgstRate: Decimal,       // 0, 6, or 9 (for intra-state)
    igstRate: Decimal,       // 0, 12, or 18 (for inter-state)
    cessRate: Decimal,       // Optional (e.g., 0.5, 1)
    cessType: String,        // Optional (e.g., "luxury", "tourism")
  },
  
  // Calculated taxes
  calculatedTax: {
    cgst: Decimal,
    sgst: Decimal,
    igst: Decimal,
    cess: Decimal,
    totalTax: Decimal,
  },
  
  // Guest location (for determining tax type)
  guestState: String,
  propertyState: String,
}
```

### 8.2 Tax Calculation Logic

```javascript
function calculateTax(baseAmount, propertyState, guestState, gstRate, cessRate = 0) {
  const isIntraState = propertyState === guestState;
  
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let cess = 0;
  
  if (isIntraState) {
    // Intra-state: CGST + SGST
    cgst = baseAmount * (gstRate / 2) / 100;
    sgst = baseAmount * (gstRate / 2) / 100;
  } else {
    // Inter-state: IGST
    igst = baseAmount * gstRate / 100;
  }
  
  // CESS calculation (on base amount)
  if (cessRate > 0) {
    cess = baseAmount * cessRate / 100;
  }
  
  const totalTax = cgst + sgst + igst + cess;
  const totalAmount = baseAmount + totalTax;
  
  return {
    baseAmount,
    cgst,
    sgst,
    igst,
    cess,
    totalTax,
    totalAmount
  };
}
```

### 8.3 Database Schema Considerations

```prisma
model Property {
  // ... existing fields ...
  
  // Tax configuration
  gstRate          Decimal?  @db.Decimal(5, 2)  // 0, 12, or 18
  cgstRate         Decimal?  @db.Decimal(5, 2)  // 0, 6, or 9
  sgstRate         Decimal?  @db.Decimal(5, 2)  // 0, 6, or 9
  igstRate         Decimal?  @db.Decimal(5, 2)  // 0, 12, or 18
  cessRate         Decimal?  @db.Decimal(5, 2)  // Optional
  cessType         String?   // Optional: "luxury", "tourism", etc.
  taxExempt        Boolean   @default(false)    // If property is tax-exempt
  
  // ... other fields ...
}

model Booking {
  // ... existing fields ...
  
  // Tax breakdown
  baseAmount        Decimal   @db.Decimal(10, 2)
  cgst              Decimal?  @db.Decimal(10, 2)
  sgst              Decimal?  @db.Decimal(10, 2)
  igst              Decimal?  @db.Decimal(10, 2)
  cess              Decimal?  @db.Decimal(10, 2)
  totalTax          Decimal   @db.Decimal(10, 2)
  totalAmount       Decimal   @db.Decimal(10, 2)
  
  // Guest location for tax determination
  guestState        String?
  guestCity         String?
  
  // ... other fields ...
}
```

---

## 9. Compliance Requirements

### 9.1 GST Registration
- **Mandatory**: If annual turnover > ₹20 lakhs (₹10 lakhs for special category states)
- **GSTIN**: 15-character unique identifier

### 9.2 Invoice Requirements
- Must include:
  - GSTIN of supplier and recipient
  - HSN/SAC code
  - Taxable value
  - CGST, SGST, IGST amounts
  - Total tax amount
  - Total invoice value

### 9.3 Filing Returns
- **GSTR-1**: Monthly/quarterly return for outward supplies
- **GSTR-3B**: Monthly summary return
- **GSTR-9**: Annual return

---

## 10. Special Cases

### 10.1 Exempt Properties
- Properties with room tariff ≤ ₹1,000/day are exempt from GST
- Still need to maintain records

### 10.2 Composite Scheme
- Small businesses can opt for composite scheme
- Lower tax rate but no ITC benefit

### 10.3 Reverse Charge Mechanism
- In some cases, recipient pays GST instead of supplier
- Less common in hospitality sector

---

## 11. Best Practices for Implementation

### 11.1 Tax Configuration
- Allow property owners to configure tax rates per property
- Default rates based on room tariff
- Support for custom tax rates (if applicable)

### 11.2 Tax Calculation
- Calculate tax at booking time (not at payment)
- Store tax breakdown in booking record
- Display tax breakdown in invoice/receipt

### 11.3 State Management
- Store guest state/city during booking
- Store property state/city in property record
- Use this to determine CGST+SGST vs IGST

### 11.4 Invoice Generation
- Generate GST-compliant invoices
- Include all required fields
- Maintain invoice number sequence

### 11.5 Reporting
- Generate tax reports for compliance
- Separate reports for CGST, SGST, IGST
- Export data for GST return filing

---

## 12. Example Scenarios

### Scenario 1: Budget Property (₹800/day)
```
Base Amount: ₹800
GST Rate: 0% (exempt)
Tax: ₹0
Total: ₹800
```

### Scenario 2: Mid-Range Property (₹5,000/day) - Same State
```
Base Amount: ₹5,000
GST Rate: 5%
CGST: ₹125 (2.5%)
SGST: ₹125 (2.5%)
Total Tax: ₹250
Total: ₹5,250
```

### Scenario 3: Luxury Property (₹10,000/day) - Different State
```
Base Amount: ₹10,000
GST Rate: 18%
IGST: ₹1,800 (18%)
CESS: ₹100 (1% - if applicable)
Total Tax: ₹1,900
Total: ₹11,900
```

---

## 13. References & Resources

- **GST Portal**: https://www.gst.gov.in/
- **GST Rates**: https://www.gst.gov.in/about-us/gst-rates
- **Hospitality Sector Guidelines**: Check CBIC circulars
- **State-wise GST Rules**: Varies by state

---

## 14. Next Steps for Implementation

1. **Database Schema**: Add tax fields to Property and Booking models
2. **Tax Configuration UI**: Allow admins to set tax rates per property
3. **Tax Calculation Service**: Create service to calculate taxes based on guest/property location
4. **Invoice Generation**: Update invoice to include tax breakdown
5. **Reporting**: Create tax reports for compliance
6. **Testing**: Test with various scenarios (same state, different state, exempt properties)

---

## Summary

- **CGST + SGST**: Used for intra-state transactions (same state)
- **IGST**: Used for inter-state transactions (different states)
- **CESS**: Additional tax on specific services (optional)
- **GST Rates**: 0% (≤₹999), 5% (₹1,000-₹7,499), 18% (≥₹7,500)
- **Key Factor**: Guest state vs Property state determines tax type
- **Compliance**: Proper invoicing and return filing required

---

*Last Updated: [Current Date]*
*Version: 1.0*

