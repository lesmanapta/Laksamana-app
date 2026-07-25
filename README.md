# 🚀 Laksamana.id - Full-Stack Plagiarism & AI Detection Platform

A modern full-stack web application designed for document plagiarism detection (Turnitin No-Repository simulation), AI content checking (GPTZero), automated paraphrasing, package token subscriptions, and real-time order tracking.

---

## 🛠️ Technology Stack

### **Backend (`/server`)**
* **Runtime**: Node.js
* **Framework**: Express.js
* **Authentication**: JWT (JSON Web Tokens)
* **File Uploads**: Multer middleware (handling `.pdf`, `.docx` up to 25MB)
* **Plagiarism Engine**: Simulated Turnitin & GPTZero analysis engine calculating similarity score, AI percentage, and matched sources.

### **Frontend (`/client`)**
* **Framework**: React 18 + Vite
* **Styling**: Bootstrap 5 + Custom CSS Palette (`#f99f1e` Orange & `#6d55cd` Purple)
* **Icons**: Remix Icons & Bootstrap Icons
* **Features**:
  * Hero banner carousel & emergency alert callout
  * Dynamic service catalog & interactive package selector
  * File upload dropzone & order checkout form
  * Live order status tracker with progress timeline & report downloader
  * Tutorial step-by-step modal & User JWT Login/Register modal

---

## ⚡ Quick Start Guide

### **1. Install Dependencies**

Install root, backend, and frontend packages:
```bash
# Navigate to project directory
cd C:\Users\lesma\.gemini\antigravity\scratch\Laksamana-app

# Set PATH to Node v18 (if using Laragon)
$env:PATH = "C:\laragon\bin\nodejs\node-v18;" + $env:PATH

# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
cd ..
```

### **2. Running the Application**

#### **Option A: Run Full-Stack Concurrently (Recommended)**
From the root directory (`Laksamana-app`):
```bash
npm run dev
```

#### **Option B: Run Backend & Frontend Separately**

* **Backend API Server**:
  ```bash
  cd server
  npm start
  # Server will run on http://localhost:5000
  ```

* **Frontend Development Server**:
  ```bash
  cd client
  npm run dev
  # Client will run on http://localhost:3000
  ```

---

## 📡 API Reference Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | API health check status |
| `GET` | `/api/services` | Retrieve list of available plagiarism services |
| `GET` | `/api/services/packages` | Retrieve available subscription package offers |
| `POST` | `/api/auth/register` | Register a new user account |
| `POST` | `/api/auth/login` | Login user & return JWT token |
| `POST` | `/api/orders/create` | Upload document & place a new plagiarism check order |
| `GET` | `/api/orders/track/:id` | Search order status by Order ID or WhatsApp number |
| `GET` | `/api/orders/download/:id` | Download generated plagiarism report summary TXT/PDF |
