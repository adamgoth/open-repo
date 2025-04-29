# Open Repo

_Open Repo_ is an Electron desktop app that helps you **select, scan, and generate prompts** from files inside a code repository.

It is optimized for AI prompting workflows by building file maps, aggregating file contents, counting tokens, and formatting structured prompts automatically.

The app is built with:

- **Electron Forge** for cross-platform desktop packaging

- **Vite** for fast frontend development

- **React** for UI

- **Tailwind CSS** for styling

- **React Arborist** for file tree navigation

- **GPT Tokenizer** for token counting

---

## Features

- 📂 Select a project folder and browse files in a tree view

- 🔍 Filter files using global and custom ignore patterns

- ✍️ Select files, add custom instructions, and auto-generate structured prompts

- 🧮 View live token counts per file, directory, and selection

- 📋 Copy formatted prompts to clipboard

- ⚡ Fast and lightweight, runs locally with no server dependencies

---

## Getting Started

### 1. Install Dependencies

Clone the repo and install:

```bash

npm  install

```

### 2. Run in Development

To start the application in development mode, run the following command in your terminal:

```bash

npm  run  start

```

## Building the App

To create a production build:

1. Build the frontend:

```bash

npm  run  build

```

2. Package the Electron app:

```bash

npm  run  package

```

> The packaged app will appear under the `out/` directory.

3. (Optional) Create OS-specific installers:

```bash

npm  run  make

```

---

## How to Use Open Repo

1. Launch the app.

2. Click the folder icon 📂 to select a project directory.

3. The file tree will load automatically (honoring `.gitignore` and `repo_ignore` rules).

4. Select individual files or entire folders.

5. (Optional) Edit ignore filters by clicking the filter icon.

6. Enter an **Instruction** (e.g., "Summarize these files" or "Refactor this code").

7. Pick a predefined **template** or write a custom instruction.

8. Click **Generate Prompt**.

9. View the formatted prompt and file map preview.

10. Click **Copy Prompt** to copy to clipboard for use in an LLM chat or fine-tuning workflow.
