# ZomeStay - Premium Property Booking & Management Platform

ZomeStay is a comprehensive property booking and management solution built with modern web technologies. It connects travelers with unique stays while providing robust tools for hosts, travel agents, and administrators to manage their operations efficiently.

## 🚀 Key Features

### 👤 For Users (Travelers)
*   **Property Discovery**: Advanced search and filtering to find the perfect stay.
*   **Booking Management**: Seamless booking process with detailed history.
*   **User Profile**: specific user dashboard to manage personal details and preferences.
*   **Secure Authentication**: OTP-based login and secure session management.

### 🏨 For Hosts
*   **Property Management**: Add, edit, and manage multiple property listings.
*   **Inventory Control**: Real-time management of room availability and pricing.
*   **Dashboard**: Analytics on revenue, bookings, and inquiries.
*   **Rate Plans**: Flexible rate plan creation (meal plans, special rates).
*   **Front Desk Ops**: Check-in/Check-out and guest management tools.

### 🛡️ For Admins
*   **Centralized Control**: Manage all users, hosts, and agents from a single panel.
*   **Verification**: Approve or reject property listings and agent applications.
*   **Financials**: View transaction histories and platform revenue.
*   **Site Configuration**: Manage global site settings, amenities, and facility lists.

### 💼 For Travel Agents
*   **Agent Dashboard**: Dedicated tools for booking on behalf of clients.
*   **Commission Tracking**: Monitor earnings and booking performance.
*   **Exclusive Access**: Access to special inventory or rates (if configured).

## 🛠️ Technology Stack

*   **Frontend**: React.js (Vite)
*   **State Management**: Redux Toolkit & Redux Persist
*   **Styling**: Tailwind CSS & Vanilla CSS
*   **Routing**: React Router DOM (v6+)
*   **HTTP Client**: Axios with Interceptors (Token management)
*   **UI Components**: Lucide React, React Icons, Ant Design (AntD), Material UI (MUI)
*   **Charts**: Recharts

## 📦 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd zomes_stay
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the development server**
    ```bash
    npm run dev
    ```

4.  **Build for production**
    ```bash
    npm run build
    ```

## 📂 Project Structure

```
src/
├── assets/          # Static assets (images, icons)
├── components/      # Reusable UI components
├── context/         # React Context providers (e.g., SearchContext)
├── pages/           # Page components (routed views)
│   ├── Admin/       # Admin portal pages
│   ├── Host/        # Host portal pages
│   ├── Agent/       # Agent portal pages
│   └── ...          # User portal pages
├── routes/          # Route definitions and Protected Route wrappers
├── services/        # API service modules (Auth, Property, etc.)
├── store/           # Redux slices and store configuration
└── ...
```

## 🔐 Authentication

The platform uses a multi-role authentication system:
*   **JWT-based Auth**: Secure token management.
*   **Role-Based Access Control (RBAC)**: Distinct routes and protections for `User`, `Host`, `Admin`, and `Agent`.
*   **Auto-Logout**: Security interceptors to handle token expiration.

## 🤝 Contributing

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request
