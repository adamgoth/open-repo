# Electron + Vite + React + Tailwind CSS Starter

This is a starter template for building desktop applications using:

- **Electron Forge**: For building and packaging cross-platform desktop apps.
- **Vite**: As the frontend build tool, providing a fast development experience.
- **React**: The JavaScript library for building user interfaces.
- **React Router**: For handling routing within the React application.
- **Tailwind CSS**: A utility-first CSS framework for rapid UI development.

## Getting Started

To get started with this template:

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Run the development server:**

    ```bash
    npm run dev
    ```

    This will start the Vite development server for the renderer process (your React app).

3.  **Start the Electron application:**
    In a separate terminal, run:
    ```bash
    npm start
    ```
    This command uses Electron Forge to launch the main Electron process, which will load your React app from the Vite dev server.

## Building the Application

To build your application for production:

1.  **Build the React frontend:**

    ```bash
    npm run build
    ```

    This creates a production-ready build of your React app using Vite.

2.  **Package the Electron app:**

    ```bash
    npm run package
    ```

    This uses Electron Forge to package your application into distributable formats for different operating systems.

3.  **Create installers (optional):**
    ```bash
    npm run make
    ```
    This uses Electron Forge to create installers (e.g., `.dmg`, `.exe`, `.deb`) for your packaged application.

## Project Structure

- `main.js`: The entry point for the Electron main process.
- `src/`: Contains the source code for the React application (renderer process).
  - `main.jsx`: The entry point for the React application.
  - `App.jsx`: The main application component with routing.
  - `index.css`: Global styles and Tailwind CSS imports.
- `tailwind.config.js`: Configuration file for Tailwind CSS.
- `vite.config.js`: Configuration file for Vite.
- `electron.vite.config.js`: Configuration specific to Electron Vite integration.
