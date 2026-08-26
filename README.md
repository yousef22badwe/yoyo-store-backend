# Yoyo Store Backend

This is the backend API for Yoyo Store (POS & Store Management System), built with NestJS and Prisma.

## Database Schema (ERD)

Here is the visual representation of our database tables and their relationships:

```mermaid
erDiagram
    STORE {
        String id PK
        String name
        String ownerPhone
    }
    
    EMPLOYEE {
        String id PK
        String storeId FK
        String name
        String phone
        String role
    }

    PRODUCT {
        String id PK
        String storeId FK
        String name
        Decimal salePrice
        Int quantity
        String condition
    }

    CUSTOMER {
        String id PK
        String storeId FK
        String name
        String phone
        Decimal totalDebt
    }

    INVOICE {
        String id PK
        String storeId FK
        String customerId FK
        String employeeId FK
        String invoiceType
        Decimal totalAmount
        String paymentMethod
    }

    INVOICE_ITEM {
        String id PK
        String invoiceId FK
        String productId FK
        Int quantity
    }

    PAYMENT_CHANNEL {
        String id PK
        String storeId FK
        String name
        Decimal balance
    }

    CASH_DRAWER_TRANSACTION {
        String id PK
        String storeId FK
        String type
        Decimal amount
    }

    STORE ||--o{ EMPLOYEE : manages
    STORE ||--o{ PRODUCT : owns
    STORE ||--o{ CUSTOMER : has
    STORE ||--o{ INVOICE : generates
    STORE ||--o{ PAYMENT_CHANNEL : has
    
    EMPLOYEE ||--o{ INVOICE : creates
    CUSTOMER ||--o{ INVOICE : belongs_to
    
    INVOICE ||--|{ INVOICE_ITEM : contains
    PRODUCT ||--o{ INVOICE_ITEM : included_in
```

## How to Test (For Testers)

1. Clone this repository to your local machine.
2. Run `npm install` to install dependencies.
3. Ask the developer for the `.env` file (which contains the `DATABASE_URL` and `JWT_SECRET`) and place it in the root folder.
4. Run `npm run start:dev` to start the server.
5. Open `http://localhost:3000/api-docs` in your browser to access the Swagger UI and test the endpoints.
