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
  // --- File Map Generation (Needs Implementation) ---
  // We need the file structure data here. Assuming it's passed or fetched.
  // For now, we'll just create a placeholder message.
  // const fileMapString = generateFileMapString(selectedFilePaths, baseDirectoryPath); // Ideal
  const fileMapString = `<file_map>\n[File map generation not yet implemented]\nBased on: ${baseDirectoryPath}\n</file_map>`; // Placeholder

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
    // Add leading slash if missing after removing base path
    const relative = fullPath.substring(basePath.length);
    return relative.startsWith('/') || relative.startsWith('\\')
      ? relative.substring(1)
      : relative;
  }
  return fullPath; // Fallback to full path if base path is not applicable
}
