export const Messages = {
  errors: {
    invalidLocale: (locale: string) => `Invalid locale: ${locale}`,
    noLocalesFound: 'No locales found in the project',
    noLocalesFoundHint:
      'Please ensure your project contains locale files (e.g., src/i18n/[locale].json or src/i18n/[locale]/...)',
    sourceLocaleInTarget: 'Source locale cannot be included in the target locales',
    noTargetLocales:
      'No target locales specified. Please add target locales in config or use -t option.',
    configNotFound: 'Config file not found. Please run `lara-dev init` to create a config file.',
    invalidConfig: (issues: string) => `Invalid configuration file. Issues found:\n${issues}`,
    noApiCredentials:
      'No API credentials found. Please run `lara-dev init` to set the API credentials.',
    apiAuthFailed: (context: string) =>
      `${context}: Authentication failed. Your API credentials are invalid or expired. Run 'lara-dev init --reset-credentials' to update them.`,
    serviceUnavailable: (context: string, statusCode: number) =>
      `${context}: Service unavailable (${statusCode}). Please try again later.`,
    translationFailed: (context: string, message: string) =>
      `${context}: Translation failed: ${message || 'Unknown error'}`,
    translatingFile: (filePath: string, message: string) =>
      `Error translating ${filePath}: ${message}`,
    sourceLocaleRequired: 'Source locale selection is required',
    configOverwriteDeclined: 'Configuration file already exists. Initialization cancelled.',
    credentialValidation: (name: string) => `${name} must be 8-128 characters.`,
    envReadFailed: (message: string) =>
      `Failed to read .env file: ${message}. Please check file permissions.`,
    unknownError: 'An unknown error occurred',
    noSupportedFileTypes: 'No supported file types configured',
    emptyTranslationResult: (value: string) =>
      `Translation service returned empty result for: ${value}`,
    maxRetriesExceeded: 'Maximum retry attempts exceeded. Please try again later.',
    envVarsNotSet: 'LARA_ACCESS_KEY_ID and LARA_ACCESS_KEY_SECRET must be set',
    gettingMemories: 'Error getting Translation Memories',
    gettingGlossaries: 'Error getting Glossaries',
    errorTranslatingFile: (filePath: string) => `Error translating ${filePath}`,
    invalidPath: 'Invalid path',
    selectAtLeastOneLocale: 'Please select at least one locale',
    selectAtLeastOnePath: 'Please select at least one path',
    progressTotalInvalid: 'Progress total must be greater than 0',
    processing: 'Processing...',
    selectionRequired: 'At least one choice must be selected',
    unknownErrorFallback: 'Unknown error',
    translationCompletedWithErrors: 'Translation completed with errors',
    localizationFailed: 'Localization failed due to errors',
  },

  success: {
    configCreated:
      'Config file created successfully! You can run `lara-dev translate` to start translating your files.',
    apiCredentialsSet: 'API credentials set successfully',
    localizationCompleted: 'Localization completed! Happy coding!',
    allFilesTranslated: 'All files translated successfully!',
    completed: 'Completed!',
    foundLocales: (count: number) =>
      `Found ${count} ${count === 1 ? 'locale' : 'locales'} in project`,
    foundTargetLocales: (count: number, locales?: string) =>
      locales
        ? `Found ${count} target ${count === 1 ? 'locale' : 'locales'}: ${locales}`
        : `Found ${count} target ${count === 1 ? 'locale' : 'locales'}`,
    foundFileCombinations: (count: number) =>
      count > 1 ? `Found ${count} files to localize` : `Found ${count} file to localize`,
    pathsFound: 'Paths found successfully',
    foundMemories: (count: number) =>
      `Found ${count} Translation ${count === 1 ? 'Memory' : 'Memories'}:\n`,
    foundGlossaries: (count: number) =>
      `Found ${count} ${count === 1 ? 'Glossary' : 'Glossaries'}:\n`,
    targetLocalesSelected: (locales: string, summary?: string) =>
      `Target locales selected: ${locales}${summary || ''}`,
    totalTargetLocalesSelected: (count: number, summary?: string) =>
      `Total ${count} target ${count === 1 ? 'locale' : 'locales'} selected${summary || ''}`,
  },

  summary: {
    title: '📦 Localization Summary',
    filesLocalized: (count: number) => `${count} ${count === 1 ? 'file' : 'files'}`,
    targetLocales: (count: number) => `${count} ${count === 1 ? 'locale' : 'locales'}`,
    allDone: '✓ All done! Happy coding!',
    filesLabel: 'Files localized',
    targetLocalesLabel: 'Target locales',
  },

  info: {
    searchingLocales: 'Searching for locales in project...',
    searchingTargetLocales: 'Searching for target locales...',
    searchingPaths: 'Searching for paths...',
    calculatingWork: 'Calculating total work...',
    translatingFiles: 'Translating files...',
    translatingFileProgress: (inputPath: string, targetLocale: string, keysCount: number) =>
      `Translating ${inputPath} → ${targetLocale} (${keysCount} keys)...`,
    creatingConfig: 'Creating config file...',
    fetchingMemories: 'Fetching Translation Memories...',
    fetchingGlossaries: 'Fetching Glossaries...',
    autoDetectionSkipped: 'Automatic detection of target locales was skipped.',
    noTargetLocalesFound: 'No target locales were found. You can add them manually.',
    noPathsFound: 'No paths found',
    noEnvFile: 'No .env file found. Creating one...',
    alreadyAdded: (locales: string) => `Already added: ${locales}`,
    localesAlreadyAdded: (count: number) =>
      `${count} ${count === 1 ? 'locale' : 'locales'} already added`,
    autoDetected: (count: number) => `${count} auto-detected`,
    manuallyAdded: (count: number) => `${count} manually added`,
  },

  warnings: {
    noApiCredentials: `No API credentials found on machine. Without API credentials, Lara Dev will not be able to translate your files. You can insert them anytime later by modifying your system environment variables or your .env file. You can find more info at https://support.laratranslate.com/en/about-lara`,
    noMemoriesLinked: (url: string) =>
      `No Translation Memories linked. Visit ${url} to learn more.`,
    noGlossariesLinked: (url: string) => `No Glossaries linked. Visit ${url} to learn more.`,
  },

  ui: {
    disabled: '(disabled)',
    typeToSearch: 'Type to search...',
    searchLabel: (query: string) => `Search: ${query}`,
    navigate: '↑/↓',
    space: 'Space',
    enter: 'Enter',
    ctrlA: 'Ctrl+A',
    helpMultiSelect: (navigate: string, space: string, ctrlA: string) =>
      `(Type to search, ${navigate} navigate, ${space} select, ${ctrlA} toggle all)`,
    helpSingleSelect: (navigate: string, spaceEnter: string) =>
      `(Type to search, ${navigate} navigate, ${spaceEnter} to select)`,
    itemId: (id: string) => `  ID: ${id}`,
    itemName: (name: string) => `  Name: ${name}`,
  },

  prompts: {
    sourceLocale: 'What is the source locale?',
    autoDetectTarget: 'Automatically detect and add target locales?',
    selectPaths: 'Select the paths to watch',
    addMoreTargetLocales: (alreadyAdded: string) =>
      `Do you want to add more target locales? (${alreadyAdded})`,
    selectTargetLocales: 'What are the target locales?',
    selectAdditionalTargetLocales: 'Select additional target locales',
    enterPaths:
      'No paths found, enter the paths to watch (separated by a comma, a space or a combination of both)',
    resetCredentials: 'Do you want to reset the API credentials?',
    overwriteConfig: 'Config file already exists, do you want to overwrite it?',
    insertCredentials:
      'No API credentials found on machine, do you want to insert them now in a .env file?',
    apiKey: 'Insert your API Key:',
    apiSecret: 'Insert your API Secret:',
    selectMemories: 'Select the memories Lara will use to personalize your translations',
    selectGlossaries: 'Select the glossaries Lara will use to personalize your translations',
    updateMemories: 'Do you want to update the selected Translation Memories?',
    useMemories: 'Do you want to use Translation Memories?',
    updateGlossaries: 'Do you want to update the selected Glossaries?',
    useGlossaries: 'Do you want to use Glossaries?',
  },
} as const;
