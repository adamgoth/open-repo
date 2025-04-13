import { countTokens } from 'gpt-tokenizer';

/**
 * Aggregates content from selected files, adds instructions, and includes token counts.
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
  let promptParts = [];
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
      fileDetails: [], // Return empty fileDetails on error
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
        const tokenCount = countTokens(result.content); // Calculate tokens
        promptParts.push(`File: ${relativePath}`);
        promptParts.push(result.content);
        fileDetails.push({ path: relativePath, tokenCount }); // Store details
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

  // Add instruction if provided and count its tokens
  if (instruction && instruction.trim()) {
    const instructionText = instruction.trim();
    const instructionTokens = countTokens(instructionText); // Calculate tokens for instruction
    promptParts.push(`Instruction: ${instructionText}`);
    fileDetails.push({ path: 'Instruction', tokenCount: instructionTokens }); // Store instruction details
  }

  const formattedPrompt = promptParts.join('\n\n'); // Separate sections with double newlines

  return { formattedPrompt, errors, fileDetails }; // Return fileDetails
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
