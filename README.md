# GoJim - Gym Management Subscription

A full-stack gym management platform built for real-world usability.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Backend Setup
```bash
cd backend
npm install
# Edit .env with your MongoDB URI
npm run seed    # Seed sample data
npm run dev     # Start API server on port 5000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev     # Start Next.js on port 3000
```

### Demo Accounts
| Role    | Email              | Password    |
|---------|-------------------|-------------|
| Owner   | owner@gojim.com   | password123 |
| Staff   | staff@gojim.com   | password123 |
| Trainer | trainer@gojim.com | password123 |

## 📁 Project Structure
```
├── backend/
│   ├── src/
│   │   ├── config/       # DB connection
│   │   ├── controllers/  # Route handlers
│   │   ├── middleware/    # Auth & RBAC
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # API routes
│   │   ├── utils/        # WhatsApp mock
│   │   ├── seed.js       # Data seeder
│   │   └── server.js     # Express entry
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js pages
│   │   ├── components/   # Reusable UI
│   │   ├── context/      # Auth context
│   │   └── lib/          # API client
│   └── .env.local
└── README.md
```

## 🔑 Features
- Dashboard with real-time stats
- Member management with dropout detection
- Self check-in attendance system
- Payment tracking with revenue analytics
- Lead management with follow-up scheduling
- Automated alerts (dropout, payment, follow-up)
- WhatsApp message automation (mock)
- Role-based access control (Owner/Staff/Trainer)

## 🛠 Tech Stack
- **Frontend:** Next.js, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** MongoDB, Mongoose
- **Auth:** JWT with RBAC
