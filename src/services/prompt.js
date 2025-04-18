import { countTokens } from 'gpt-tokenizer';

/**
 * Aggregates content from selected files, adds instructions, includes token counts,
 * and formats the output with specific tags.
 * @param {string[]} selectedFilePaths - Array of absolute file paths.
 * @param {string} instruction - Custom instruction text.
 * @param {string} baseDirectoryPath - The base path of the scanned directory.
 * @returns {Promise<{formattedPrompt: string, errors: Array<{path: string, error: string, message?: string}>, fileDetails: Array<{path: string, tokenCount: number}>}>}
 */
export async function createPrompt(
  selectedFilePaths,
  instruction,
  baseDirectoryPath,
) {
  // --- Generate File Map ---
  const fileMapString = generateFileMapString(
    selectedFilePaths,
    baseDirectoryPath,
  );

  let fileContentsString = '';
  const errors = [];
  const fileDetails = []; // Store path and token count

  if (!Array.isArray(selectedFilePaths)) {
    console.error('createPrompt: selectedFilePaths must be an array');
    return {
      formattedPrompt: '',
      errors: [
        {
          path: 'N/A',
          error: 'InternalError',
          message: 'Selected files data is invalid.',
        },
      ],
      fileDetails: [],
    };
  }

  // --- Process Files for Content ---
  for (const filePath of selectedFilePaths) {
    try {
      const result = await window.electronAPI.readFileContent(filePath);

      if (result.error) {
        console.warn(`Skipping file due to error: ${filePath}`, result);
        const relativePath = getRelativePath(filePath, baseDirectoryPath);
        errors.push({
          path: relativePath,
          error: result.error,
          message: result.message || `Size: ${result.size} bytes`,
        });
        // Add error marker to file contents as well?
        fileContentsString += `File: ${relativePath}\n\`\`\`\nError reading file: ${
          result.error
        } (${result.message || 'Details unavailable'})\n\`\`\`\n\n`;
        fileDetails.push({ path: relativePath, tokenCount: 0 }); // Add entry with 0 tokens for error files
        continue;
      }

      if (typeof result.content === 'string') {
        const relativePath = getRelativePath(filePath, baseDirectoryPath);
        const tokenCount = countTokens(result.content);
        // Append file content in the desired format
        fileContentsString += `File: ${relativePath}\n\`\`\`\n${result.content}\n\`\`\`\n\n`;
        fileDetails.push({ path: relativePath, tokenCount });
      } else {
        console.warn(`Unexpected response for file: ${filePath}`, result);
        const relativePath = getRelativePath(filePath, baseDirectoryPath);
        errors.push({
          path: relativePath,
          error: 'UnexpectedResponse',
          message: 'Invalid content received from main process.',
        });
        // Add error marker to file contents
        fileContentsString += `File: ${relativePath}\n\`\`\`\nError: Unexpected response format from main process.\n\`\`\`\n\n`;
        fileDetails.push({ path: relativePath, tokenCount: 0 });
      }
    } catch (error) {
      console.error(`Error invoking readFileContent for ${filePath}:`, error);
      const relativePath = getRelativePath(filePath, baseDirectoryPath);
      errors.push({
        path: relativePath,
        error: 'IPCError',
        message: error.message,
      });
      // Add error marker to file contents
      fileContentsString += `File: ${relativePath}\n\`\`\`\nError: Could not invoke file read operation (${error.message}).\n\`\`\`\n\n`;
      fileDetails.push({ path: relativePath, tokenCount: 0 });
    }
  }

  // --- Prepare Instruction Section ---
  let userInstructionsString = '';
  if (instruction && instruction.trim()) {
    const instructionText = instruction.trim();
    const instructionTokens = countTokens(instructionText);
    userInstructionsString = `<user_instructions>\n${instructionText}\n</user_instructions>`;
    // Add instruction tokens to fileDetails if needed for total count
    fileDetails.push({ path: 'Instruction', tokenCount: instructionTokens });
  } else {
    userInstructionsString = `<user_instructions>\n[No instruction provided]\n</user_instructions>`;
  }

  // --- Combine Sections ---
  // Ensure sections are separated by exactly one newline
  const formattedPrompt = [
    fileMapString,
    `<file_contents>\n${fileContentsString.trim()}\n</file_contents>`, // Trim trailing newlines from last file
    userInstructionsString,
  ].join('\n\n'); // Join sections with double newlines

  return { formattedPrompt, errors, fileDetails };
}

/**
 * Helper to get a relative path, falling back to the original path.
 * @param {string} fullPath
 * @param {string} basePath
 * @returns {string}
 */
function getRelativePath(fullPath, basePath) {
  if (basePath && fullPath.startsWith(basePath)) {
    const relative = fullPath.substring(basePath.length);
    // Ensure leading slash is removed for consistency
    return relative.startsWith('/') || relative.startsWith('\\')
      ? relative.substring(1)
      : relative;
  }
  return fullPath; // Fallback to full path if base path is not applicable
}

/**
 * Generates a string representation of the selected file structure.
 * @param {string[]} selectedFilePaths - Array of absolute file paths.
 * @param {string} baseDirectoryPath - The base path of the scanned directory.
 * @returns {string}
 */
function generateFileMapString(selectedFilePaths, baseDirectoryPath) {
  const relativePaths = selectedFilePaths.map((fp) =>
    getRelativePath(fp, baseDirectoryPath),
  ); //.sort();
  const tree = {};

  // Build the tree structure from paths
  relativePaths.forEach((relPath) => {
    const parts = relPath.split(/[\\/]/); // Split by forward or backslash
    let currentLevel = tree;
    parts.forEach((part, index) => {
      if (!part) return; // Skip empty parts (e.g., from leading slash)
      if (index === parts.length - 1) {
        // Last part is the file
        currentLevel[part] = null; // Mark as file
      } else {
        // Directory part
        if (!currentLevel[part]) {
          currentLevel[part] = {}; // Create directory object if it doesn't exist
        }
        currentLevel = currentLevel[part];
      }
    });
  });

  // Recursive function to format the tree into a string
  function formatTree(node, prefix = '', isLast = true) {
    let result = '';
    const keys = Object.keys(node).sort((a, b) => {
      // Sort directories before files, then alphabetically
      const aIsDir = node[a] !== null;
      const bIsDir = node[b] !== null;
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });

    keys.forEach((key, index) => {
      const currentIsLast = index === keys.length - 1;
      const connector = currentIsLast ? '└── ' : '├── ';
      result += `${prefix}${connector}${key}\n`;

      // If it's a directory (not null), recurse
      if (node[key] !== null) {
        const newPrefix = prefix + (currentIsLast ? '    ' : '│   ');
        result += formatTree(node[key], newPrefix, currentIsLast);
      }
    });
    return result;
  }

  // Format the final string
  const baseName = baseDirectoryPath.split(/[\\/]/).pop() || baseDirectoryPath; // Get last part of base path
  const mapContent = formatTree(tree);
  return `<file_map>\n${baseName}\n${mapContent.trim()}\n</file_map>`;
}
