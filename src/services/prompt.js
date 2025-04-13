/**
 * Aggregates content from selected files and adds instructions.
 * @param {string[]} selectedFilePaths - Array of absolute file paths.
 * @param {string} instruction - Custom instruction text.
 * @param {string} baseDirectoryPath - The base path of the scanned directory, used to make file paths relative.
 * @returns {Promise<{formattedPrompt: string, errors: Array<{path: string, error: string, message?: string}>}>} - The formatted prompt string and any errors encountered.
 */
export async function createPrompt(
  selectedFilePaths,
  instruction,
  baseDirectoryPath,
) {
  let promptParts = [];
  const errors = [];

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
    };
  }

  for (const filePath of selectedFilePaths) {
    try {
      // Use the exposed Electron API function
      const result = await window.electronAPI.readFileContent(filePath);

      // Check for errors returned from the main process
      if (result.error) {
        console.warn(`Skipping file due to error: ${filePath}`, result);
        errors.push({
          path: getRelativePath(filePath, baseDirectoryPath),
          error: result.error,
          message: result.message || `Size: ${result.size} bytes`,
        });
        continue; // Skip this file
      }

      if (typeof result.content === 'string') {
        const relativePath = getRelativePath(filePath, baseDirectoryPath);
        promptParts.push(`File: ${relativePath}`);
        promptParts.push(result.content);
      } else {
        // Handle unexpected response structure
        console.warn(`Unexpected response for file: ${filePath}`, result);
        errors.push({
          path: getRelativePath(filePath, baseDirectoryPath),
          error: 'UnexpectedResponse',
          message: 'Invalid content received from main process.',
        });
      }
    } catch (error) {
      // Catch errors during the IPC call itself
      console.error(`Error invoking readFileContent for ${filePath}:`, error);
      errors.push({
        path: getRelativePath(filePath, baseDirectoryPath),
        error: 'IPCError',
        message: error.message,
      });
    }
  }

  // Add instruction if provided
  if (instruction && instruction.trim()) {
    promptParts.push(`Instruction: ${instruction.trim()}`);
  }

  const formattedPrompt = promptParts.join('\n\n'); // Separate sections with double newlines

  return { formattedPrompt, errors };
}

/**
 * Helper to get a relative path, falling back to the original path.
 * @param {string} fullPath
 * @param {string} basePath
 * @returns {string}
 */
function getRelativePath(fullPath, basePath) {
  if (basePath && fullPath.startsWith(basePath)) {
    // Add leading slash if missing after removing base path
    const relative = fullPath.substring(basePath.length);
    return relative.startsWith('/') || relative.startsWith('\\')
      ? relative.substring(1)
      : relative;
  }
  return fullPath; // Fallback to full path if base path is not applicable
}
