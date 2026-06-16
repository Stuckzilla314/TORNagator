# TORNagator

A web application for the game TORN, built using ReactJS, that interfaces with the TORN WebAPI.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Make sure you have Node.js and npm (Node Package Manager) installed. You can download them from [nodejs.org](https://nodejs.org/).

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd TORNagator
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```

### Running the Application

To run the application:

```bash
npm start
npm run android:run
```

This will build the React application and launch the Electron application directly. No local web server will run on `http://localhost:3000`.

### Building for Production

To build the application assets:

```bash
npm run build
```

This command compiles the React frontend assets to the `build` folder.

## Features

- User login with TORN API key.
- Display of available user information (basic and profile selections).