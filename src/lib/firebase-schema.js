/*
Firebase Realtime Database Structure:

/customers
  /{customerId}
    - id
    - name
    - phone
    - address
    - createdAt
    - updatedAt
    - totalPurchases
    - balance
    - lastPurchaseDate

/memos
  /{memoId}
    - id
    - customerId
    - customerName
    - date
    - items: [
        {
          productId
          productName
          quantity
          price
          total
        }
      ]
    - subtotal
    - discount
    - tax
    - total
    - paymentMethod
    - paymentStatus
    - createdAt
    - updatedAt

/cash_transactions
  /{transactionId}
    - id
    - type (SALE, PURCHASE, EXPENSE, PAYMENT_RECEIVED)
    - amount
    - relatedId (memoId or customerId)
    - description
    - date
    - paymentMethod
    - createdAt
    - category
    - notes
*/
