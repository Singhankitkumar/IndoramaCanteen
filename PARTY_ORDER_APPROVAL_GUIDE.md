# Party Order Approval Guide

## Overview

This guide explains how to manage and approve party order requests in the Indorama Canteen system. Party orders are complimentary meals for corporate events, but all requests must go through an approval workflow for accountability and cost tracking.

## Access Control

### Who Can Approve Party Orders?
- **Admins only** - Users with `is_admin = true` in the database
- Regular employees cannot approve orders

### How to Become an Admin
Contact your database administrator to set `is_admin = true` for your profile in the `profiles` table.

---

## Step-by-Step: Approving Party Orders

### Step 1: Navigate to Admin Panel

1. Log in to the Canteen App
2. Go to the **Admin** tab in the navigation
3. Click on **Order Management** section

### Step 2: View Pending Party Requests

The admin panel shows:
- **Recent Orders** list with order status
- Filter by order status: `pending`, `approved`, `rejected`, `completed`
- Order details including:
  - Department name
  - Party date
  - Estimated headcount
  - Total cost
  - Items ordered
  - Special notes/requirements

### Step 3: Review Order Details

Before approving, check:
1. **Validity of Request**
   - Is the party date at least 2 days in advance?
   - Is the department valid?
   - Are all required fields filled?

2. **Budget Considerations**
   - Check the total cost (shown in orange highlight)
   - Verify the estimated headcount makes sense for the items ordered
   - Review any special requests in the description

3. **Item Selection**
   - Verify selected items are appropriate for the event
   - Check if items require special preparation

### Step 4: Approve the Order

1. In the order card, locate the **Status dropdown** (next to order details)
2. Click the dropdown showing "Pending"
3. Select **"approved"** from the options
4. The system automatically:
   - Updates the order status
   - Records the approval timestamp
   - Marks it for kitchen preparation
   - Generates a cost report for the department

**Approval is instant** - no additional confirmation needed.

### Step 5: Reject the Order (if necessary)

If you need to reject a party request:

1. Click the **Status dropdown**
2. Select **"rejected"**
3. The order is marked as rejected
4. The requester can view the rejection status in their "Party Orders" tab

**Note**: Consider informing the department head about rejections with reasons.

---

## Order Status Workflow

```
pending (Initial State)
    ↓
    ├→ approved (Approved for catering)
    │     ↓
    │     └→ completed (Event served)
    │
    └→ rejected (Request declined)
```

### Status Meanings

| Status | Meaning | Next Action |
|--------|---------|------------|
| **pending** | Awaiting admin approval | Admin must review and approve/reject |
| **approved** | Approved, ready for kitchen | Kitchen prepares the items |
| **rejected** | Request declined | Requester can revise and resubmit |
| **completed** | Event finished, items served | No further action needed |

---

## Example Scenarios

### Scenario 1: Approving a Team Lunch Party

**Request Details:**
- Department: Engineering
- Party Date: 2024-12-20 (5 days away ✓ Valid)
- Headcount: 25 employees
- Items: 25x Butter Chicken, 25x Biryani, 10x Lassi
- Total Cost: ₹8,750
- Special Request: "Vegetarian option for 5 people needed"

**Decision**: ✅ APPROVE
- Date is valid (2+ days advance)
- Budget seems reasonable
- Items are appropriate
- Special request is noted

**Action**: Change status to "approved" → Kitchen gets notified

### Scenario 2: Rejecting an Invalid Request

**Request Details:**
- Department: Sales
- Party Date: 2024-12-13 (Today + 1 day ✗ Invalid)
- Headcount: 50 employees
- Total Cost: ₹15,000

**Decision**: ❌ REJECT
- Only 1 day advance (requires 2+ days)
- Does not meet booking deadline

**Action**: Change status to "rejected" → Notify department to resubmit with valid date

---

## Important Features

### Viewing Full Order Details

Click on an order card to expand and see:
- Complete item list with quantities
- Department contact information
- Complete description/notes
- Cost breakdown
- Approval history

### Sorting & Filtering

- Orders are sorted by **newest first** (most recent requests first)
- Filter by status to focus on pending requests only
- Use the dropdown to see all statuses

### Cost Accountability

Every approved party order:
1. **Generates a cost report** → Sent to the ordering department
2. **Is tracked in consumption logs** → Ingredients used are recorded
3. **Appears in billing reports** → For cost accountability and compliance

---

## Party Order Billing & Deductions

### For Employees
- **Regular meals** → Deducted from salary monthly
- **Party orders (Approved)** → Also deducted from salary (marked as "complimentary" but tracked)
- **Party orders (Rejected/Pending)** → NO deduction

### For Department
- Admin can generate reports showing:
  - Total party order costs per month
  - Department-wise spending
  - Cost per headcount (for budget planning)

---

## Common Questions

### Q: Can an employee approve their own party request?
**A:** No - only admins can approve. Employee should submit request and wait for admin approval.

### Q: What happens if I reject a party order?
**A:** The department can see the rejection and can submit a new request with corrections.

### Q: Can I change my mind after approving?
**A:** Yes - if the status is still "approved" (not yet "completed"), you can change it to "rejected" or vice versa.

### Q: When should I mark an order as "completed"?
**A:** After the party has been served. This finalizes the order and includes it in ingredient consumption tracking.

### Q: Who receives the cost report?
**A:** The cost is automatically tracked. Department heads can view it in the Billing section of the app.

---

## Admin Responsibilities Checklist

- [ ] Review pending party requests daily
- [ ] Approve valid requests within 24 hours
- [ ] Reject invalid requests with proper notice
- [ ] Mark orders as "completed" after the event
- [ ] Monitor ingredient consumption trends
- [ ] Generate monthly reports for accountability
- [ ] Communicate with departments about rejections

---

## For More Information

- **Admin Panel**: "Admin" tab → "Order Management"
- **Reports**: "Admin" tab → "Reports" section
- **Ingredient Tracking**: "Admin" tab → "Reports" → "Consumption Reports"
- **Database**: Check `party_orders` table for raw data

---

**Last Updated**: 2024
**Version**: 1.0
