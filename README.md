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

To run the application in development mode:

```bash
npm start
```

This will open the application in your browser at `http://localhost:3000`. The page will reload if you make edits.

### Building for Production

To build the application for production:

```bash
npm run build
```

This command builds the app for production to the `build` folder. It correctly bundles React in production mode and optimizes the build for the best performance.

## Features

- User login with TORN API key.
- Display of available user information (basic and profile selections).