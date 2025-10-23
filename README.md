# Trade Coin Desktop App

A cryptocurrency trading desktop application built with React + TypeScript + Electron.

## Project Structure

```
trade-coin/
├── frontend/          # React frontend application
│   ├── src/          # Source code
│   ├── package.json  # Frontend dependencies
│   └── vite.config.ts
├── electron/         # Electron main process
│   ├── src/          # Electron source code
│   └── package.json  # Electron dependencies
└── package.json      # Root package.json
```

## Getting Started

### 1. Install Dependencies

```bash
./install.sh
# or
yarn install:all
```

### 2. Development

```bash
./dev.sh
# or
yarn dev
```

This will:
- Start the Vite dev server for frontend
- Start Electron and load the frontend

### 3. Build for Production

```bash
./build.sh
# or
yarn build
```

This will:
- Build the frontend
- Package the Electron app

## Available Scripts

### Shell Scripts (Recommended)
- `./install.sh` - Install all dependencies
- `./dev.sh` - Start development mode
- `./build.sh` - Build for production
- `./clean.sh` - Clean all node_modules and build files

### Yarn Scripts
- `yarn dev` - Start development mode
- `yarn build` - Build for production
- `yarn install:all` - Install all dependencies
- `yarn clean` - Clean all node_modules and build files

## Features

- **Spot Trading**: Buy/sell cryptocurrencies
- **Futures Trading**: Long/short positions with leverage
- **Real-time PnL**: Calculate profit/loss
- **Order Management**: Create, cancel, and track orders
- **Dark Theme**: Modern dark UI design
- **Desktop App**: Native desktop experience with Electron