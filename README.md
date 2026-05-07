# WStore - Multi-tenant WhatsApp Commerce Platform

WStore is a robust, production-ready commerce platform designed to enable businesses to sell products directly through WhatsApp. It features a sophisticated multi-tenant architecture, allowing super-admins to manage multiple merchants (tenants), each with their own branches, products, and sales logs.

## 🚀 Overview

WStore bridges the gap between traditional e-commerce and conversational commerce. By leveraging the WhatsApp Business API, it allows customers to browse products and place orders within their favorite messaging app, while providing merchants with a powerful React-based admin dashboard to manage their operations.

## 📂 Project Structure

The project is organized as a monorepo-style structure containing both the backend API and the administrative frontend:

```text
.
├── server.js               # Backend entry point
├── config/                 # Database and environment configurations
├── controllers/            # MVC Controllers for API logic
├── models/                 # Sequelize models (PostgreSQL)
├── routes/                 # API route definitions
├── services/               # Business logic and external integrations
├── migrations/             # Database schema migrations
├── seeders/                # Initial data seeding
└── wstore_admin/           # React-based Admin Dashboard (Vite)
```

## ✨ Key Features

- **Multi-Tenancy**: Support for multiple organizations with isolated data and configurations.
- **Admin Dashboard**: A premium, responsive dashboard built with React 19 and Vite for merchant management.
- **Product Management**: Comprehensive tools for managing categories, products, and inventory.
- **Branch Management**: Ability to manage multiple physical or logical branches per tenant.
- **WhatsApp Integration**: Native integration for order placement and customer communication via WhatsApp.
- **Automated Invoicing**: Professional PDF invoice generation for completed orders.
- **Sales Book & Ledger**: Detailed tracking of sales, expenses, and financial summaries.
- **Push Notifications**: Real-time updates for admins and customers via Firebase Cloud Messaging (FCM).
- **Scheduled Tasks**: Automated log purging and maintenance using `node-cron`.

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js (v5)
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JSON Web Tokens (JWT)
- **Notifications**: Firebase Admin SDK
- **Utilities**: PDFKit (Invoices), Axios, Node-cron

### Frontend (Admin)
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Vanilla CSS with modern design principles
- **Icons**: Lucide React
- **Charts**: Recharts
- **Routing**: React Router 7

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL
- A Firebase project (for FCM)
- Meta WhatsApp Business API credentials

### Backend Setup
1. Clone the repository and navigate to the root:
   ```bash
   npm install
   ```
2. Configure environment variables:
   - Copy `.env.example` (if available) to `.env` or create one with `DB_URL`, `JWT_SECRET`, etc.
3. Run database migrations:
   ```bash
   npx sequelize-cli db:migrate
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Admin Dashboard Setup
1. Navigate to the admin directory:
   ```bash
   cd wstore_admin
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```

## 📜 License

This project is licensed under the **ISC License**.
# friska
