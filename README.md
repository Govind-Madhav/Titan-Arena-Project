# 🌌 Titan Arena — The Next Generation Esports Battlefield

Titan Arena is a premium, high-performance esports tournament management platform designed for the modern gaming era. Built with a focus on immersive aesthetics, real-time persistence, and secure competitive play.

![Titan Arena Logo](https://img.shields.io/badge/TITAN-ARENA-8B5CF6?style=for-the-badge&logo=riot-games&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node J](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)

---

## ✨ Key Features

### 🛡️ Hardened Authentication
- **Hybrid Security**: Unified Firebase Identity and JWT-based session management.
- **Silent Refresh**: Seamless session persistence via HttpOnly cookies and automatic token renewal.
- **Uplink Verification**: Secure OTP-based email verification flow with branded templates.

### 🏆 Tournament Lifecycle
- **Elite Hosting**: Comprehensive tournament management system for verified hosts.
- **Global Leaderboards**: Real-time rank tracking with local (IN) and global filters.
- **Team Synergy**: Full-featured team management, scrim coordination, and player discovery.

### 🎨 Immersive Experience
- **Premium Aesthetics**: Vibrant dark-mode interface with glassmorphism, neon accents, and smooth GSAP/Framer Motion animations.
- **3D Visuals**: Interactive background effects powered by Three.js and OGL.
- **Dynamic Snapshots**: Optimized layout breakpoints ensuring a "Titan Look" across all screen sizes.

### 💳 Titan Wallet
- **Instant Rewards**: Secure wallet integration for crystalline transaction tracking and prize distribution.
- **Currency**: Native integration with localized currency support (₹).

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/), [GSAP](https://gsap.com/)
- **3D Graphics**: [Three.js](https://threejs.org/), [React Three Fiber](https://r3f.docs.pmnd.rs/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Styling**: Vanilla CSS + [Tailwind CSS](https://tailwindcss.com/)

### Backend
- **Framework**: [Express.js](https://expressjs.com/) (Node.js)
- **Database**: [MySQL](https://www.mysql.com/) + [Drizzle ORM](https://orm.drizzle.team/)
- **Cache/Session**: [Redis](https://redis.io/)
- **Identity**: [Firebase Admin SDK](https://firebase.google.com/docs/admin)
- **Validation**: [Zod](https://zod.dev/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MySQL Server
- Redis Server
- Firebase Project (Service Account)

### Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Govind-Madhav/Titan-Arena-Project.git
   cd Titan-Arena-Project
   ```

2. **Backend Configuration**
   - Navigate to `CODE/BACKEND`
   - Create a `.env` file based on `.env.example`
   - Install dependencies: `npm install`
   - Push schema: `npm run db:push`
   - Start dev server: `npm run dev`

3. **Frontend Configuration**
   - Navigate to `CODE/FRONTEND`
   - Create a `.env` file with `VITE_API_URL`
   - Install dependencies: `npm install`
   - Start vite: `npm run dev`

---

## 📜 Dev Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Starts server/frontend in watch mode |
| `npm run db:push` | Pushes local Drizzle schema to MySQL |
| `npm run worker` | Starts the Firebase background sync worker |
| `npm run seed` | Seeds the database with initial tournament data |

---

## 🛡️ License
Proprietary. Copyright © 2025 Titan E-sports. All rights reserved.
