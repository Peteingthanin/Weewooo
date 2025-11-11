# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   npx install -g expo-cli
   ```

2. Start the app

   ```bash
   npx expo start --tunnel
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Update New Setup

This is a two-part application for managing medical inventory: a Node.js Express API backend with a MySQL database, and a React Native (Expo) frontend for mobile/web scanning and tracking.

## ⚙️ Prerequisites

You must have the following installed on your machine:

1. **Node.js (LTS)**: For running both the API and the frontend.

2. **MySQL Server**: To host the application database (`QMedicDB`).

3. **Expo CLI**: Required to run the React Native application.

   ```bash
   npm install -g expo-cli
   ```


## 1. 🗄️ Database Setup (MySQL)

You must ensure your MySQL database is set up with the correct credentials and schema.

### A. Database Connection Details

The API server (server.js) connects using these credentials:

| Setting | Value |
|---------|-------------|
| **Host** | 192.168.1.47 (Change this if MySQL is on a different machine) |
| **User** | usrParamedic |
| **Password** | paramedic1234 |
| **Database** | QMedicDB |

Action Required: Ensure your MySQL server is running and accessible using these details.

### B. Essential Schema 


## 2. 🚀 Backend API Server Setup

### A. Install Dependencies

In your project root (where server.js is located):

```bash
npm install express mysql2 cors
```

### B. Run the Server

Keep this terminal window open while running the frontend:

```bash
node server.js
```

The console should show: 🚀 Server running on port 3000

## 3. 📱 Frontend Application Setup (React Native/Expo)

### A. Install Dependencies

In your project root:

```bash
npm install
# OR: yarn install
```

### B. Critical Configuration in InventoryContext.tsx and NotificationContext.tsx

The app must know the address of the API server.

Action Required: In the file contexts/InventoryContext.tsx, update the API_BASE_URL with the correct local network IP address of the computer running your server.

```bash
// contexts/InventoryContext.tsx
// 1. API Configuration: *** UPDATE THIS WITH YOUR ACTUAL SERVER IP ***
const API_BASE_URL = 'http://<YOUR_COMPUTER_IP_ADDRESS>:3000/api'; 
```

### C. Run the Frontend (using LAN)

To avoid Mixed Content errors, do not use the tunnel unless necessary.

Ensure your API server is running (node server.js).

Start the Expo client for local network access:

```bash
expo start
# OR: npx expo start
```


Ensure the Expo CLI terminal displays Connection: LAN.

Scan the QR code with the Expo Go app on your physical device, or use an emulator/web option.

Your application should now load data from the API and allow you to perform inventory actions.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
