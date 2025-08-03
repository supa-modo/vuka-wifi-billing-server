# VukaWiFi Billing System - Backend API

A comprehensive, production-grade WiFi billing system backend built with Node.js, Express, TypeScript, and PostgreSQL. This system provides APIs for managing WiFi access through payment plans, M-Pesa integration, and router management.

## 🚀 Features

### Core Functionality

- **Payment Plan Management**: Create and manage flexible WiFi billing plans
- **M-Pesa Integration**: Process payments via M-Pesa STK Push
- **WiFi Credential Management**: Generate and manage time-based WiFi passwords
- **Router Integration**: MikroTik router API integration for device management
- **SMS Integration**: Send WiFi credentials via SMS
- **Multi-Device Support**: Single password for multiple devices per plan

### Technical Features

- **TypeScript**: Full type safety and modern JavaScript features
- **PostgreSQL**: Robust relational database with ACID compliance
- **Redis**: High-performance caching and session management
- **JWT Authentication**: Secure admin authentication
- **Validation**: Comprehensive request validation with express-validator
- **Rate Limiting**: Protection against abuse and DDoS attacks
- **Error Handling**: Centralized error handling with detailed responses
- **Logging**: Comprehensive logging for debugging and monitoring

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher (comes with Node.js)
- **PostgreSQL**: v14.0 or higher
- **Redis**: v6.0 or higher (optional but recommended)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd vuka-wifi-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the environment template and configure your variables:

```bash
cp env.example .env
```

Edit the `.env` file with your specific configuration:

```bash
# Server Configuration
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vuka_wifi_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Admin Configuration
ADMIN_EMAIL=admin@vukawifi.com
ADMIN_PASSWORD=admin123
ADMIN_FIRST_NAME=System
ADMIN_LAST_NAME=Administrator

# Add other configurations as needed...
```

### 4. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE vuka_wifi_db;
CREATE USER vuka_wifi_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE vuka_wifi_db TO vuka_wifi_user;
```

### 5. Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:5000` with the following output:

```
🚀 VukaWiFi Billing System Backend Started Successfully!

📊 Server Information:
   • Environment: development
   • Port: 5000
   • API Version: v1
   • Database: Connected ✅

🌐 Available Endpoints:
   • Health Check: http://localhost:5000/health
   • API Base: http://localhost:5000/api/v1
   • API Info: http://localhost:5000/api

🔐 Default Admin Credentials:
   • Email: admin@vukawifi.com
   • Password: admin123

⚡ Ready to accept requests!
```

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api/v1
```

### Authentication

Admin endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Payment Plans API

#### Get All Payment Plans

```http
GET /api/v1/payment-plans
```

Query Parameters:

- `active_only=true` - Get only active plans

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "1 Hour",
      "description": "Perfect for quick browsing",
      "durationHours": 1,
      "price": 15,
      "currency": "KES",
      "maxDevices": 2,
      "isActive": true,
      "isPopular": false,
      "features": ["High Speed Internet", "HD Video Streaming"],
      "durationDisplay": "1 Hour",
      "dataLimitDisplay": "500 MB",
      "speedLimitDisplay": "10 Mbps"
    }
  ],
  "count": 1
}
```

#### Get Single Payment Plan

```http
GET /api/v1/payment-plans/:id
```

#### Calculate Price for Multiple Devices

```http
GET /api/v1/payment-plans/:id/calculate-price?deviceCount=3
```

Response:

```json
{
  "success": true,
  "data": {
    "planId": "uuid",
    "planName": "1 Day",
    "basePrice": 50,
    "deviceCount": 3,
    "calculatedPrice": 110,
    "currency": "KES",
    "savings": 40
  }
}
```

#### Create Payment Plan (Admin)

```http
POST /api/v1/payment-plans
Content-Type: application/json

{
  "name": "2 Hours",
  "description": "Extended browsing session",
  "durationHours": 2,
  "price": 25,
  "dataLimitMB": 1024,
  "speedLimitKbps": 10240,
  "maxDevices": 2,
  "features": ["High Speed Internet", "HD Video Streaming"]
}
```

#### Update Payment Plan (Admin)

```http
PUT /api/v1/payment-plans/:id
```

#### Delete Payment Plan (Admin)

```http
DELETE /api/v1/payment-plans/:id
```

#### Toggle Plan Status (Admin)

```http
PATCH /api/v1/payment-plans/:id/toggle
```

#### Set Popular Plan (Admin)

```http
PATCH /api/v1/payment-plans/:id/set-popular
```

## 🗃️ Database Schema

### Payment Plans Table

```sql
payment_plans (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_hours INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  data_limit_mb BIGINT,
  speed_limit_kbps INTEGER,
  max_devices INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  is_popular BOOLEAN DEFAULT FALSE,
  features JSON DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Other Tables

- `admins` - Admin user accounts
- `payments` - M-Pesa payment records
- `wifi_credentials` - Generated WiFi passwords and device tracking

## 🔧 Development Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Database operations
npm run db:migrate
npm run db:seed
npm run db:reset
```

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
npm test -- --testPathPattern=paymentPlans
```

### Test Coverage

```bash
npm run test:coverage
```

## 🌐 Production Deployment

### 1. Environment Setup

```bash
NODE_ENV=production
PORT=5000
DB_SSL=true
# ... other production configurations
```

### 2. Build the Application

```bash
npm run build
```

### 3. Start Production Server

```bash
npm start
```

### 4. Process Management with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2 
pm2 start dist/index.js --name "vuka-wifi-api"

# Enable startup script
pm2 startup
pm2 save
```

## 📊 Monitoring

### Health Checks

- **Server Health**: `GET /health`
- **API Health**: `GET /api/v1/health`

### Logging

Logs are written to the console in development and can be configured for file logging in production.

### Performance Monitoring

- Request logging with Morgan
- Rate limiting for API protection
- Database query optimization

## 🔐 Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling
- **Input Validation**: Request validation
- **JWT Authentication**: Secure admin access
- **Password Hashing**: bcrypt for passwords
- **SQL Injection Prevention**: Sequelize ORM

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- **Email**: support@vukawifi.com
- **Phone**: +254 790 193402
- **Documentation**: `/api/v1/docs`

---

**Built with ❤️ for the Kenyan WiFi hotspot market**
