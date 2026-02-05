/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import Ask from '@/components/Ask';
import Markdown from '@/components/Markdown';
import ModelSelectionModal from '@/components/ModelSelectionModal';
import ThemeToggle from '@/components/theme-toggle';
import WikiTreeView from '@/components/WikiTreeView';
import { useLanguage } from '@/contexts/LanguageContext';
import { RepoInfo } from '@/types/repoinfo';
import getRepoUrl from '@/utils/getRepoUrl';
import { extractUrlDomain, extractUrlPath } from '@/utils/urlDecoder';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaBitbucket, FaBookOpen, FaComments, FaDownload, FaExclamationTriangle, FaFileExport, FaFolder, FaGithub, FaGitlab, FaHome, FaSync, FaTimes } from 'react-icons/fa';
// Define the WikiSection and WikiStructure types directly in this file
// since the imported types don't have the sections and rootSections properties
interface WikiSection {
  id: string;
  title: string;
  pages: string[];
  subsections?: string[];
}

interface WikiPage {
  id: string;
  title: string;
  content: string;
  filePaths: string[];
  importance: 'high' | 'medium' | 'low';
  relatedPages: string[];
  parentId?: string;
  isSection?: boolean;
  children?: string[];
}

interface WikiStructure {
  id: string;
  title: string;
  description: string;
  pages: WikiPage[];
  sections: WikiSection[];
  rootSections: string[];
}

// Add CSS styles for wiki with Japanese aesthetic
const wikiStyles = `
  .prose code {
    @apply bg-[var(--background)]/70 px-1.5 py-0.5 rounded font-mono text-xs border border-[var(--border-color)];
  }

  .prose pre {
    @apply bg-[var(--background)]/80 text-[var(--foreground)] rounded-md p-4 overflow-x-auto border border-[var(--border-color)] shadow-sm;
  }

  .prose h1, .prose h2, .prose h3, .prose h4 {
    @apply font-serif text-[var(--foreground)];
  }

  .prose p {
    @apply text-[var(--foreground)] leading-relaxed;
  }

  .prose a {
    @apply text-[var(--accent-primary)] hover:text-[var(--highlight)] transition-colors no-underline border-b border-[var(--border-color)] hover:border-[var(--accent-primary)];
  }

  .prose blockquote {
    @apply border-l-4 border-[var(--accent-primary)]/30 bg-[var(--background)]/30 pl-4 py-1 italic;
  }

  .prose ul, .prose ol {
    @apply text-[var(--foreground)];
  }

  .prose table {
    @apply border-collapse border border-[var(--border-color)];
  }

  .prose th {
    @apply bg-[var(--background)]/70 text-[var(--foreground)] p-2 border border-[var(--border-color)];
  }

  .prose td {
    @apply p-2 border border-[var(--border-color)];
  }
`;

// Helper function to generate cache key for localStorage
const getCacheKey = (owner: string, repo: string, repoType: string, language: string, isComprehensive: boolean = true): string => {
  return `deepwiki_cache_${repoType}_${owner}_${repo}_${language}_${isComprehensive ? 'comprehensive' : 'concise'}`;
};

// Helper function to add tokens and other parameters to request body
const addTokensToRequestBody = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestBody: Record<string, any>,
  token: string,
  repoType: string,
  provider: string = '',
  model: string = '',
  isCustomModel: boolean = false,
  customModel: string = '',
  language: string = 'en',
  excludedDirs?: string,
  excludedFiles?: string,
  includedDirs?: string,
  includedFiles?: string
): void => {
  if (token !== '') {
    requestBody.token = token;
  }

  // Add provider-based model selection parameters
  requestBody.provider = provider;
  requestBody.model = model;
  if (isCustomModel && customModel) {
    requestBody.custom_model = customModel;
  }

  requestBody.language = language;

  // Add file filter parameters if provided
  if (excludedDirs) {
    requestBody.excluded_dirs = excludedDirs;
  }
  if (excludedFiles) {
    requestBody.excluded_files = excludedFiles;
  }
  if (includedDirs) {
    requestBody.included_dirs = includedDirs;
  }
  if (includedFiles) {
    requestBody.included_files = includedFiles;
  }

};

const createGithubHeaders = (githubToken: string): HeadersInit => {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json'
  };

  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
  }

  return headers;
};

const createGitlabHeaders = (gitlabToken: string): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (gitlabToken) {
    headers['PRIVATE-TOKEN'] = gitlabToken;
  }

  return headers;
};

const createBitbucketHeaders = (bitbucketToken: string): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (bitbucketToken) {
    headers['Authorization'] = `Bearer ${bitbucketToken}`;
  }

  return headers;
};


export default function RepoWikiPage() {
  // Get route parameters and search params
  const params = useParams();
  const searchParams = useSearchParams();

  // Extract owner and repo from route params
  const owner = params.owner as string;
  const repo = params.repo as string;

  // Extract tokens from search params
  const token = searchParams.get('token') || '';
  const localPath = searchParams.get('local_path') ? decodeURIComponent(searchParams.get('local_path') || '') : undefined;
  const repoUrl = searchParams.get('repo_url') ? decodeURIComponent(searchParams.get('repo_url') || '') : undefined;
  const providerParam = searchParams.get('provider') || '';
  const modelParam = searchParams.get('model') || '';
  const isCustomModelParam = searchParams.get('is_custom_model') === 'true';
  const customModelParam = searchParams.get('custom_model') || '';
  const language = searchParams.get('language') || 'en';
  const repoHost = (() => {
    if (!repoUrl) return '';
    try {
      return new URL(repoUrl).hostname.toLowerCase();
    } catch (e) {
      console.warn(`Invalid repoUrl provided: ${repoUrl}`);
      return '';
    }
  })();
  const repoType = repoHost?.includes('bitbucket')
    ? 'bitbucket'
    : repoHost?.includes('gitlab')
      ? 'gitlab'
      : repoHost?.includes('github')
        ? 'github'
        : searchParams.get('type') || 'github';

  // Import language context for translations
  const { messages } = useLanguage();

  // Initialize repo info
  const repoInfo = useMemo<RepoInfo>(() => ({
    owner,
    repo,
    type: repoType,
    token: token || null,
    localPath: localPath || null,
    repoUrl: repoUrl || null
  }), [owner, repo, repoType, localPath, repoUrl, token]);

  // State variables
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState<string | undefined>(
    messages.loading?.initializing || 'Initializing wiki generation...'
  );
  const [error, setError] = useState<string | null>(null);
  const [wikiStructure, setWikiStructure] = useState<WikiStructure | undefined>();
  const [currentPageId, setCurrentPageId] = useState<string | undefined>();
  const [generatedPages, setGeneratedPages] = useState<Record<string, WikiPage>>({});
  const [pagesInProgress, setPagesInProgress] = useState(new Set<string>());
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [originalMarkdown, setOriginalMarkdown] = useState<Record<string, string>>({});
  const [requestInProgress, setRequestInProgress] = useState(false);
  const [currentToken, setCurrentToken] = useState(token); // Track current effective token
  const [effectiveRepoInfo, setEffectiveRepoInfo] = useState(repoInfo); // Track effective repo info with cached data
  const [embeddingError, setEmbeddingError] = useState(false);

  // Model selection state variables
  const [selectedProviderState, setSelectedProviderState] = useState(providerParam);
  const [selectedModelState, setSelectedModelState] = useState(modelParam);
  const [isCustomSelectedModelState, setIsCustomSelectedModelState] = useState(isCustomModelParam);
  const [customSelectedModelState, setCustomSelectedModelState] = useState(customModelParam);
  const [showModelOptions, setShowModelOptions] = useState(false); // Controls whether to show model options
  const excludedDirs = searchParams.get('excluded_dirs') || '';
  const excludedFiles = searchParams.get('excluded_files') || '';
  const [modelExcludedDirs, setModelExcludedDirs] = useState(excludedDirs);
  const [modelExcludedFiles, setModelExcludedFiles] = useState(excludedFiles);
  const includedDirs = searchParams.get('included_dirs') || '';
  const includedFiles = searchParams.get('included_files') || '';
  const [modelIncludedDirs, setModelIncludedDirs] = useState(includedDirs);
  const [modelIncludedFiles, setModelIncludedFiles] = useState(includedFiles);


  // Wiki type state - default to comprehensive view
  const isComprehensiveParam = searchParams.get('comprehensive') !== 'false';
  const [isComprehensiveView, setIsComprehensiveView] = useState(isComprehensiveParam);
  // Using useRef for activeContentRequests to maintain a single instance across renders
  // This map tracks which pages are currently being processed to prevent duplicate requests
  // Note: In a multi-threaded environment, additional synchronization would be needed,
  // but in React's single-threaded model, this is safe as long as we set the flag before any async operations
  const activeContentRequests = useRef(new Map<string, boolean>()).current;
  const [structureRequestInProgress, setStructureRequestInProgress] = useState(false);
  // Create a flag to track if data was loaded from cache to prevent immediate re-save
  const cacheLoadedSuccessfully = useRef(false);

  // Create a flag to ensure the effect only runs once
  const effectRan = React.useRef(false);

  // State for Ask modal
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const askComponentRef = useRef<{ clearConversation: () => void } | null>(null);

  // Authentication state
  const [authRequired, setAuthRequired] = useState<boolean>(false);
  const [authCode, setAuthCode] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Default branch state
  const [defaultBranch, setDefaultBranch] = useState<string>('main');

  // Helper function to generate proper repository file URLs
  const generateFileUrl = useCallback((filePath: string): string => {
    if (effectiveRepoInfo.type === 'local') {
      // For local repositories, we can't generate web URLs
      return filePath;
    }

    const repoUrl = effectiveRepoInfo.repoUrl;
    if (!repoUrl) {
      return filePath;
    }

    try {
      const url = new URL(repoUrl);
      const hostname = url.hostname;
      
      if (hostname === 'github.com' || hostname.includes('github')) {
        // GitHub URL format: https://github.com/owner/repo/blob/branch/path
        return `${repoUrl}/blob/${defaultBranch}/${filePath}`;
      } else if (hostname === 'gitlab.com' || hostname.includes('gitlab')) {
        // GitLab URL format: https://gitlab.com/owner/repo/-/blob/branch/path
        return `${repoUrl}/-/blob/${defaultBranch}/${filePath}`;
      } else if (hostname === 'bitbucket.org' || hostname.includes('bitbucket')) {
        // Bitbucket URL format: https://bitbucket.org/owner/repo/src/branch/path
        return `${repoUrl}/src/${defaultBranch}/${filePath}`;
      }
    } catch (error) {
      console.warn('Error generating file URL:', error);
    }

    // Fallback to just the file path
    return filePath;
  }, [effectiveRepoInfo, defaultBranch]);

  // Memoize repo info to avoid triggering updates in callbacks

  // Add useEffect to handle scroll reset
  useEffect(() => {
    // Scroll to top when currentPageId changes
    const wikiContent = document.getElementById('wiki-content');
    if (wikiContent) {
      wikiContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPageId]);

  // close the modal when escape is pressed
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAskModalOpen(false);
      }
    };

    if (isAskModalOpen) {
      window.addEventListener('keydown', handleEsc);
    }

    // Cleanup on unmount or when modal closes
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isAskModalOpen]);

  // Fetch authentication status on component mount
  useEffect(() => {
    const fetchAuthStatus = async () => {
      try {
        setIsAuthLoading(true);
        const response = await fetch('/api/auth/status');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAuthRequired(data.auth_required);
      } catch (err) {
        console.error("Failed to fetch auth status:", err);
        // Assuming auth is required if fetch fails to avoid blocking UI for safety
        setAuthRequired(true);
      } finally {
        setIsAuthLoading(false);
      }
    };

    fetchAuthStatus();
  }, []);

  // Generate content for a wiki page
  const generatePageContent = useCallback(async (page: WikiPage, owner: string, repo: string) => {
    return new Promise<void>(async (resolve) => {
      try {
        // Skip if content already exists
        if (generatedPages[page.id]?.content) {
          resolve();
          return;
        }

        // Skip if this page is already being processed
        // Use a synchronized pattern to avoid race conditions
        if (activeContentRequests.get(page.id)) {
          console.log(`Page ${page.id} (${page.title}) is already being processed, skipping duplicate call`);
          resolve();
          return;
        }

        // Mark this page as being processed immediately to prevent race conditions
        // This ensures that if multiple calls happen nearly simultaneously, only one proceeds
        activeContentRequests.set(page.id, true);

        // Validate repo info
        if (!owner || !repo) {
          throw new Error('Invalid repository information. Owner and repo name are required.');
        }

        // Mark page as in progress
        setPagesInProgress(prev => new Set(prev).add(page.id));
        // Don't set loading message for individual pages during queue processing

        const filePaths = page.filePaths;

        // Store the initially generated content BEFORE rendering/potential modification
        setGeneratedPages(prev => ({
          ...prev,
          [page.id]: { ...page, content: 'Loading...' } // Placeholder
        }));
        setOriginalMarkdown(prev => ({ ...prev, [page.id]: '' })); // Clear previous original

        // Make API call to generate page content
        console.log(`Starting content generation for page: ${page.title}`);

        // Get repository URL
        const repoUrl = getRepoUrl(effectiveRepoInfo);

        // Get language name for prompts
        const languageName = language === 'en' ? 'English' :
            language === 'ja' ? 'Japanese (日本語)' :
            language === 'zh' ? 'Mandarin Chinese (中文)' :
            language === 'zh-tw' ? 'Traditional Chinese (繁體中文)' :
            language === 'es' ? 'Spanish (Español)' :
            language === 'kr' ? 'Korean (한국어)' :
            language === 'vi' ? 'Vietnamese (Tiếng Việt)' :
            language === "pt-br" ? "Brazilian Portuguese (Português Brasileiro)" :
            language === "fr" ? "Français (French)" :
            language === "ru" ? "Русский (Russian)" :
            'English';

        // Get repository type for prompts
        const repoType = effectiveRepoInfo.type || 'github';

        // Determine if this is comprehensive or concise mode based on the page title
        // Concise mode pages have titles that match the 7 main sections directly
        const isConcisePage = page.id === 'introduction' || 
                              page.id === 'architecture-design' || 
                              page.id === 'solid-principles' || 
                              page.id === 'quality-analysis' || 
                              page.id === 'dependency-management' || 
                              page.id === 'abstraction-levels' || 
                              page.id === 'conclusion';

        // Create the prompt content - organized in exact sequential structure
        const promptContent = isConcisePage ?
`You are an expert technical writer and software architect specializing in code analysis and documentation.

You will be given:
1. The "[WIKI_PAGE_TOPIC]" for the page you need to create: "${page.title}"
2. A list of "[RELEVANT_SOURCE_FILES]" from the project that you MUST use as the sole basis for the content

CRITICAL STARTING INSTRUCTION:
The very first thing on the page MUST be a \`<details>\` block listing ALL the \`[RELEVANT_SOURCE_FILES]\` you used to generate the content. There MUST be AT LEAST 5 source files listed - if fewer were provided, you MUST find additional related files to include.
Format it exactly like this:
<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

${filePaths.map(path => `- [${path}](${generateFileUrl(path)})`).join('\n')}
<!-- Add additional relevant files if fewer than 5 were provided -->
</details>

Immediately after the \`<details>\` block, the main title of the page should be a H1 Markdown heading: \`# ${page.title}\`.

Based ONLY on the content of the \`[RELEVANT_SOURCE_FILES]\`, generate a CONCISE wiki page for "${page.title}" following the structure below with SIMPLIFIED ANALYSIS and SCORING for each subsection:

${page.id === 'introduction' ? `
## Introduction
Provide a concise introduction (2-3 paragraphs) covering:
- Project purpose and goals
- Key features overview
- Technology stack summary
- Target users and use cases

Include a summary score for project clarity (1-10).
` : ''}

${page.id === 'architecture-design' ? `
## Architecture Design Analysis

### High-Level Architecture (Score: X/10)
- System architecture overview
- Main components and their relationships
- Architectural pattern identification (MVC, Layered, Microservices, etc.)
- Brief architecture diagram using Mermaid

### Design Patterns (Score: X/10)
- List top 3-5 design patterns identified
- Brief explanation of each pattern's usage
- Score pattern application quality

### Component Relationships (Score: X/10)
- Key component dependencies
- Data flow summary
- Integration points

**Overall Architecture Score**: X/10
` : ''}

${page.id === 'solid-principles' ? `
## SOLID Principles Analysis

Provide a CONCISE analysis for each principle with scoring:

### Single Responsibility Principle (SRP)
**Score**: X/4
- Key strength: [1 sentence]
- Main issue: [1 sentence]
- Example: [Brief code reference]

### Open/Closed Principle (OCP)
**Score**: X/4
- Key strength: [1 sentence]
- Main issue: [1 sentence]
- Example: [Brief code reference]

### Liskov Substitution Principle (LSP)
**Score**: X/4
- Key strength: [1 sentence]
- Main issue: [1 sentence]
- Example: [Brief code reference]

### Interface Segregation Principle (ISP)
**Score**: X/4
- Key strength: [1 sentence]
- Main issue: [1 sentence]
- Example: [Brief code reference]

### Dependency Inversion Principle (DIP)
**Score**: X/4
- Key strength: [1 sentence]
- Main issue: [1 sentence]
- Example: [Brief code reference]

**Total SOLID Score**: X/20

### Top 3 Improvement Areas
1. [Most critical SOLID issue]
2. [Second most critical issue]
3. [Third most critical issue]
` : ''}

${page.id === 'quality-analysis' ? `
## Quality Built-In Analysis

### Code Readability (Score: X/10)
- Code clarity assessment
- Naming conventions evaluation
- Documentation quality

### Test Coverage (Score: X/10)
- Test coverage percentage (estimate)
- Test quality assessment
- Key areas needing tests

### Performance (Score: X/10)
- Performance bottlenecks identified
- Optimization opportunities
- Resource usage concerns

### Security (Score: X/10)
- Security best practices adherence
- Vulnerability concerns
- Input validation assessment

### Top 3 Code Smells
1. [Most critical code smell]
2. [Second most critical]
3. [Third most critical]

**Overall Quality Score**: X/10
` : ''}

${page.id === 'dependency-management' ? `
## Dependency Management Analysis

### Coupling Analysis (Score: X/10)
- Overall coupling level
- Tight coupling issues
- Module dependencies summary

### Dependency Flow (Score: X/10)
- Dependency direction assessment
- Layer adherence
- Circular dependencies identified

### Decoupling Recommendations
- Top 3 decoupling improvements:
  1. [Priority 1]
  2. [Priority 2]
  3. [Priority 3]

**Overall Dependency Management Score**: X/10
` : ''}

${page.id === 'abstraction-levels' ? `
## Abstraction Levels Assessment

### Abstraction Usage (Score: X/10)
- Appropriateness of abstraction levels
- Concrete vs abstract balance
- Over/under-abstraction issues

### Interface Design (Score: X/10)
- Interface quality assessment
- Interface segregation
- API design evaluation

### Encapsulation (Score: X/10)
- Information hiding effectiveness
- Data protection
- Access control quality

**Overall Abstraction Score**: X/10
` : ''}

${page.id === 'conclusion' ? `
## Conclusion and Recommendations

### Overall Code Quality Score
- Calculate aggregate score from all 6 sections
- Compare to industry benchmarks
- Overall grade (A/B/C/D/F)

### Key Findings Summary
- Top 3 strengths from the analysis
- Top 3 weaknesses from the analysis
- Most critical issues to address

### Prioritized Improvement Recommendations
1. **[Priority 1 - Critical]**: [Issue description and impact]
2. **[Priority 2 - High]**: [Issue description and impact]
3. **[Priority 3 - Medium]**: [Issue description and impact]
4. **[Priority 4 - Low]**: [Issue description and impact]
5. **[Priority 5 - Nice to have]**: [Issue description and impact]

### Quick Wins
List 2-3 quick improvements that can be implemented immediately.

### Long-term Recommendations
List 2-3 strategic improvements for long-term code health.
` : ''}

IMPORTANT FORMATTING REQUIREMENTS:
- Use clear section headings with ## for main sections and ### for subsections
- Include scores in format: **Score**: X/10 or X/4
- Use bullet points for lists
- Keep descriptions concise (1-2 sentences per point)
- Include at least 3 source file citations throughout the page
- Use the format: \`Sources: [filename.ext:start_line-end_line]()\`

IMPORTANT: Generate the content in ${languageName} language.

Remember:
- Focus on MOST critical insights
- Provide actionable scores and metrics
- Keep analysis concise but meaningful
- Support all claims with source citations
- Prioritize clarity and actionability
` :
`You are an expert technical writer and software architect specializing in comprehensive code analysis and documentation.

You will be given:
1. The "[WIKI_PAGE_TOPIC]" for the page you need to create: "${page.title}"
2. A list of "[RELEVANT_SOURCE_FILES]" from the project that you MUST use as the sole basis for the content

CRITICAL STARTING INSTRUCTION:
The very first thing on the page MUST be a \`<details>\` block listing ALL the \`[RELEVANT_SOURCE_FILES]\` you used to generate the content. There MUST be AT LEAST 5 source files listed - if fewer were provided, you MUST find additional related files to include.
Format it exactly like this:
<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

${filePaths.map(path => `- [${path}](${generateFileUrl(path)})`).join('\n')}
<!-- Add additional relevant files if fewer than 5 were provided -->
</details>

Immediately after the \`<details>\` block, the main title of the page should be a H1 Markdown heading: \`# ${page.title}\`.

Based ONLY on the content of the \`[RELEVANT_SOURCE_FILES]\`, generate a comprehensive wiki page organized in the following exact sequential structure:

## 1. Introduction
Start with a concise introduction (1-2 paragraphs) explaining the purpose, scope, and high-level overview of "${page.title}" within the context of the overall project.

## 2. Architecture Design
Analyze the code structure and provide detailed architecture analysis:

### Design Patterns
- Identify design patterns used (Singleton, Factory, Observer, Strategy, Decorator, Adapter, etc.)
- Analyze architectural patterns (Layered, MVC, MVVM, Microservices, Event-Driven, Clean Architecture, etc.)
- Evaluate separation of concerns and modularity
- Assess component boundaries and dependencies
- Review data flow and control flow architecture
- Identify anti-patterns in architecture

### Architectural Diagrams
- Use Mermaid diagrams (flowchart TD, sequenceDiagram, classDiagram, erDiagram, graph TD) to visualize architectures
- All diagrams MUST follow strict vertical orientation (use "graph TD", NEVER "graph LR")
- Maximum node width should be 3-4 words
- For sequence diagrams, define ALL participants at the beginning using "participant" keyword
- Use correct Mermaid arrow syntax (A->>B: Request, B-->>A: Response, etc.)

## 3. SOLID Principles Analysis
You MUST provide a structured analysis for EACH of the five principles. For EACH principle, include:

### Single Responsibility Principle (SRP)
**Score**: X/4 (must be an integer)
✅ **Strengths**: [What the code does well regarding SRP]
⚠️ **Areas for Improvement**: [What needs improvement regarding SRP]
**Analysis**: [Detailed explanation with code examples]

### Open/Closed Principle (OCP)
**Score**: X/4 (must be an integer)
✅ **Strengths**: [What the code does well regarding OCP]
⚠️ **Areas for Improvement**: [What needs improvement regarding OCP]
**Analysis**: [Detailed explanation with code examples]

### Liskov Substitution Principle (LSP)
**Score**: X/4 (must be an integer)
✅ **Strengths**: [What the code does well regarding LSP]
⚠️ **Areas for Improvement**: [What needs improvement regarding LSP]
**Analysis**: [Detailed explanation with code examples]

### Interface Segregation Principle (ISP)
**Score**: X/4 (must be an integer)
✅ **Strengths**: [What the code does well regarding ISP]
⚠️ **Areas for Improvement**: [What needs improvement regarding ISP]
**Analysis**: [Detailed explanation with code examples]

### Dependency Inversion Principle (DIP)
**Score**: X/4 (must be an integer)
✅ **Strengths**: [What the code does well regarding DIP]
⚠️ **Areas for Improvement**: [What needs improvement regarding DIP]
**Analysis**: [Detailed explanation with code examples]

**Total SOLID Score**: X/20

SCORING CRITERIA:
- 4 points: Excellent implementation, follows the principle perfectly
- 3 points: Good implementation, minor issues
- 2 points: Moderate implementation, some violations
- 1 point: Poor implementation, significant violations
- 0 points: No adherence to the principle

IMPORTANT: Scores MUST be integers (0, 1, 2, 3, or 4). No decimal scores.

## 4. Quality Built-In Analysis
Evaluate code quality across multiple dimensions:

### Code Readability and Maintainability
- Evaluate code clarity, naming conventions, and documentation
- Assess code organization and structure
- Check for code duplication and adherence to DRY principle

### Test Coverage and Test Quality
- Assess test coverage and test quality
- Check for proper error handling and edge cases
- Review logging and debugging capabilities

### Performance and Security
- Analyze performance considerations and optimizations
- Evaluate security best practices
- Check for proper input validation and sanitization

### Code Smells and Refactoring
- Identify code smells (Long Method, Large Class, Duplicate Code, Feature Envy, etc.)
- Suggest refactoring opportunities
- Recommend design patterns to address specific issues

## 5. Dependency Management
Analyze dependencies and coupling:

### Coupling Analysis
- Analyze coupling between modules/components
- Identify tight coupling and dependencies
- Evaluate dependency direction and flow

### Circular Dependencies
- Identify circular dependencies
- Assess their impact on maintainability
- Provide resolution strategies

### Decoupling Recommendations
- Suggest improvements for better decoupling
- Recommend dependency injection patterns
- Propose interface-based designs

## 6. Abstraction Levels
Assess abstraction practices:

### Abstraction Usage
- Assess appropriate use of abstraction
- Evaluate abstraction levels and balance
- Review concrete vs abstract implementations

### Interface Design
- Evaluate interface design and segregation
- Assess abstraction contracts
- Review API design principles

### Encapsulation and Information Hiding
- Analyze encapsulation practices
- Review information hiding
- Assess data protection and access control

### Abstraction Hierarchies
- Evaluate abstraction hierarchies
- Review inheritance structures
- Assess proper abstraction layering

## 7. Conclusion/Summary
End with a comprehensive summary:
- Key findings from all analysis dimensions
- Overall code quality assessment
- Specific recommendations for improvements
- Priority ranking of improvements

IMPORTANT: Generate the content in ${languageName} language.

ADDITIONAL FORMATTING REQUIREMENTS:

### Tables
Use Markdown tables to summarize:
- Key features or components and their descriptions
- API endpoint parameters, types, and descriptions
- Configuration options, their types, and default values
- Data model fields, types, constraints, and descriptions

### Code Snippets (OPTIONAL)
- Include short, relevant code snippets to illustrate key implementation details
- Ensure snippets are well-formatted within Markdown code blocks with appropriate language identifiers

### Source Citations (EXTREMELY IMPORTANT)
- For EVERY piece of significant information, explanation, diagram, table entry, or code snippet, you MUST cite the specific source file(s) and relevant line numbers
- Place citations at the end of the paragraph, under the diagram/table, or after the code snippet
- Use the exact format: \`Sources: [filename.ext:start_line-end_line]()\` for a range, or \`Sources: [filename.ext:line_number]()\` for a single line
- Multiple files can be cited: \`Sources: [file1.ext:1-10](), [file2.ext:5](), [dir/file3.ext]()\`
- IMPORTANT: You MUST cite AT LEAST 5 different source files throughout the wiki page

### Technical Accuracy (EXTREMELY IMPORTANT)
All information must be derived SOLELY from the \`[RELEVANT_SOURCE_FILES]\`. Do not infer, invent, or use external knowledge about similar systems or common practices unless it's directly supported by the provided code.

Remember:
- Ground every claim in the provided source files
- Prioritize accuracy and direct representation of the code's functionality and structure
- Structure the document logically for easy understanding by other developers
- ALWAYS follow the exact 7-section sequential order specified above
- Create a dedicated section for each dimension using ## headings
- Provide specific examples and code references for each dimension
- Format each dimension as: ## [Section Number]. [Dimension Name] followed by your analysis
`;

        // Prepare request body
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requestBody: Record<string, any> = {
          repo_url: repoUrl,
          type: effectiveRepoInfo.type,
          messages: [{
            role: 'user',
            content: promptContent
          }]
        };

        // Add tokens if available
        addTokensToRequestBody(requestBody, currentToken, effectiveRepoInfo.type, selectedProviderState, selectedModelState, isCustomSelectedModelState, customSelectedModelState, language, modelExcludedDirs, modelExcludedFiles, modelIncludedDirs, modelIncludedFiles);

        // Use WebSocket for communication
        let content = '';

        try {
          // Create WebSocket URL from the server base URL
          const serverBaseUrl = process.env.SERVER_BASE_URL || 'http://localhost:8001';
          const wsBaseUrl = serverBaseUrl.replace(/^http/, 'ws')? serverBaseUrl.replace(/^https/, 'wss'): serverBaseUrl.replace(/^http/, 'ws');
          const wsUrl = `${wsBaseUrl}/ws/chat`;

          // Create a new WebSocket connection
          const ws = new WebSocket(wsUrl);

          // Create a promise that resolves when the WebSocket connection is complete
          await new Promise<void>((resolve, reject) => {
            // Set up event handlers
            ws.onopen = () => {
              console.log(`WebSocket connection established for page: ${page.title}`);
              // Send the request as JSON
              ws.send(JSON.stringify(requestBody));
              resolve();
            };

            ws.onerror = (error) => {
              console.error('WebSocket error:', error);
              reject(new Error('WebSocket connection failed'));
            };

            // If the connection doesn't open within 5 seconds, fall back to HTTP
            const timeout = setTimeout(() => {
              reject(new Error('WebSocket connection timeout'));
            }, 5000);

            // Clear the timeout if the connection opens successfully
            ws.onopen = () => {
              clearTimeout(timeout);
              console.log(`WebSocket connection established for page: ${page.title}`);
              // Send the request as JSON
              ws.send(JSON.stringify(requestBody));
              resolve();
            };
          });

          // Create a promise that resolves when the WebSocket response is complete
          await new Promise<void>((resolve, reject) => {
            // Handle incoming messages
            ws.onmessage = (event) => {
              content += event.data;
            };

            // Handle WebSocket close
            ws.onclose = () => {
              console.log(`WebSocket connection closed for page: ${page.title}`);
              resolve();
            };

            // Handle WebSocket errors
            ws.onerror = (error) => {
              console.error('WebSocket error during message reception:', error);
              reject(new Error('WebSocket error during message reception'));
            };
          });
        } catch (wsError) {
          console.error('WebSocket error, falling back to HTTP:', wsError);

          // Fall back to HTTP if WebSocket fails
          const response = await fetch(`/api/chat/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'No error details available');
            console.error(`API error (${response.status}): ${errorText}`);
            throw new Error(`Error generating page content: ${response.status} - ${response.statusText}`);
          }

          // Process the response
          content = '';
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error('Failed to get response reader');
          }

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              content += decoder.decode(value, { stream: true });
            }
            // Ensure final decoding
            content += decoder.decode();
          } catch (readError) {
            console.error('Error reading stream:', readError);
            throw new Error('Error processing response stream');
          }
        }

        // Clean up markdown delimiters
        content = content.replace(/^```markdown\s*/i, '').replace(/```\s*$/i, '');

        console.log(`Received content for ${page.title}, length: ${content.length} characters`);

        // Store the FINAL generated content
        const updatedPage = { ...page, content };
        setGeneratedPages(prev => ({ ...prev, [page.id]: updatedPage }));
        // Store this as the original for potential mermaid retries
        setOriginalMarkdown(prev => ({ ...prev, [page.id]: content }));

        resolve();
      } catch (err) {
        console.error(`Error generating content for page ${page.id}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        // Update page state to show error
        setGeneratedPages(prev => ({
          ...prev,
          [page.id]: { ...page, content: `Error generating content: ${errorMessage}` }
        }));
        setError(`Failed to generate content for ${page.title}.`);
        resolve(); // Resolve even on error to unblock queue
      } finally {
        // Clear the processing flag for this page
        // This must happen in the finally block to ensure the flag is cleared
        // even if an error occurs during processing
        activeContentRequests.delete(page.id);

        // Mark page as done
        setPagesInProgress(prev => {
          const next = new Set(prev);
          next.delete(page.id);
          return next;
        });
        setLoadingMessage(undefined); // Clear specific loading message
      }
    });
  }, [generatedPages, currentToken, effectiveRepoInfo, selectedProviderState, selectedModelState, isCustomSelectedModelState, customSelectedModelState, modelExcludedDirs, modelExcludedFiles, language, activeContentRequests, generateFileUrl]);

  // Determine the wiki structure from repository data
  const determineWikiStructure = useCallback(async (fileTree: string, readme: string, owner: string, repo: string) => {
    if (!owner || !repo) {
      setError('Invalid repository information. Owner and repo name are required.');
      setIsLoading(false);
      setEmbeddingError(false); // Reset embedding error state
      return;
    }

    // Skip if structure request is already in progress
    if (structureRequestInProgress) {
      console.log('Wiki structure determination already in progress, skipping duplicate call');
      return;
    }

    try {
      setStructureRequestInProgress(true);
      setLoadingMessage(messages.loading?.determiningStructure || 'Determining wiki structure...');

      // Get repository URL
      const repoUrl = getRepoUrl(effectiveRepoInfo);

      // Prepare request body
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestBody: Record<string, any> = {
        repo_url: repoUrl,
        type: effectiveRepoInfo.type,
        messages: [{
          role: 'user',
content: `Analyze this GitHub repository ${owner}/${repo} and create a comprehensive wiki structure with code analysis dimensions.

1. The complete file tree of the project:
<file_tree>
${fileTree}
</file_tree>

2. The README file of the project:
<readme>
${readme}
</readme>

I want to create a comprehensive wiki for this repository that includes both technical documentation and code analysis. The wiki should provide deep insights into the codebase architecture, design patterns, SOLID principles adherence, and overall code quality.

IMPORTANT: The wiki content will be generated in ${language === 'en' ? 'English' :
            language === 'ja' ? 'Japanese (日本語)' :
            language === 'zh' ? 'Mandarin Chinese (中文)' :
            language === 'zh-tw' ? 'Traditional Chinese (繁體中文)' :
            language === 'es' ? 'Spanish (Español)' :
            language === 'kr' ? 'Korean (한国語)' :
            language === 'vi' ? 'Vietnamese (Tiếng Việt)' :
            language === "pt-br" ? "Brazilian Portuguese (Português Brasileiro)" :
            language === "fr" ? "Français (French)" :
            language === "ru" ? "Русский (Russian)" :
            'English'} language.

The wiki content MUST be organized in the following sequential structure for comprehensive code analysis:

## 1. Introduction
- Project overview and purpose
- Key features and functionality
- Getting started information

## 2. Architecture Design
- System architecture overview (high-level architecture, component relationships)
- Design patterns analysis (identify and analyze all design patterns used)
- Architectural patterns (Layered, MVC, Microservices, Event-Driven, etc.)
- Component dependencies and data flow
- Architectural diagrams using Mermaid

## 3. SOLID Principles Analysis (CRITICAL)
- Single Responsibility Principle (SRP) - Score 0-4, strengths, areas for improvement, code examples
- Open/Closed Principle (OCP) - Score 0-4, strengths, areas for improvement, code examples
- Liskov Substitution Principle (LSP) - Score 0-4, strengths, areas for improvement, code examples
- Interface Segregation Principle (ISP) - Score 0-4, strengths, areas for improvement, code examples
- Dependency Inversion Principle (DIP) - Score 0-4, strengths, areas for improvement, code examples
- Total SOLID Score (0-20)

## 4. Quality Built-In Analysis
- Code readability and maintainability
- Test coverage and test quality
- Performance and security considerations
- Error handling and edge cases
- Code smells and refactoring opportunities

## 5. Dependency Management
- Coupling analysis between modules/components
- Dependency direction and flow
- Circular dependency identification
- Decoupling recommendations

## 6. Abstraction Levels
- Appropriate use of abstraction
- Interface design evaluation
- Encapsulation and information hiding
- Abstraction hierarchy assessment

## 7. Conclusion/Summary
- Summary of key findings
- Overall code quality assessment
- Recommendations for improvements

${isComprehensiveView ? `
Each of these 7 main sections should be broken down into specific wiki pages. Create pages that provide detailed analysis for each section.

IMPORTANT: The wiki structure MUST follow this exact sequential order. Pages should be organized to flow logically from introduction through all analysis dimensions to conclusion.

Return your analysis in the following XML format:

<wiki_structure>
  <title>[Overall title for the wiki]</title>
  <description>[Brief description of the repository and its codebase]</description>
  <sections>
    <section id="introduction">
      <title>1. Introduction</title>
      <pages>
        <page_ref>project-overview</page_ref>
        <page_ref>key-features</page_ref>
        <page_ref>getting-started</page_ref>
      </pages>
    </section>
    <section id="architecture">
      <title>2. Architecture Design</title>
      <pages>
        <page_ref>system-architecture</page_ref>
        <page_ref>design-patterns</page_ref>
        <page_ref>architectural-patterns</page_ref>
        <page_ref>component-dependencies</page_ref>
      </pages>
    </section>
    <section id="solid-principles">
      <title>3. SOLID Principles Analysis</title>
      <pages>
        <page_ref>srp-analysis</page_ref>
        <page_ref>ocp-analysis</page_ref>
        <page_ref>lsp-analysis</page_ref>
        <page_ref>isp-analysis</page_ref>
        <page_ref>dip-analysis</page_ref>
        <page_ref>solid-summary</page_ref>
      </pages>
    </section>
    <section id="quality">
      <title>4. Quality Built-In Analysis</title>
      <pages>
        <page_ref>code-readability</page_ref>
        <page_ref>test-coverage</page_ref>
        <page_ref>performance-security</page_ref>
        <page_ref>code-smells-refactoring</page_ref>
      </pages>
    </section>
    <section id="dependency">
      <title>5. Dependency Management</title>
      <pages>
        <page_ref>coupling-analysis</page_ref>
        <page_ref>dependency-flow</page_ref>
        <page_ref>circular-dependencies</page_ref>
        <page_ref>decoupling-recommendations</page_ref>
      </pages>
    </section>
    <section id="abstraction">
      <title>6. Abstraction Levels</title>
      <pages>
        <page_ref>abstraction-usage</page_ref>
        <page_ref>interface-design</page_ref>
        <page_ref>encapsulation</page_ref>
        <page_ref>abstraction-hierarchy</page_ref>
      </pages>
    </section>
    <section id="conclusion">
      <title>7. Conclusion/Summary</title>
      <pages>
        <page_ref>key-findings</page_ref>
        <page_ref>quality-assessment</page_ref>
        <page_ref>recommendations</page_ref>
      </pages>
    </section>
  </sections>
  <pages>
    <!-- Introduction Pages -->
    <page id="project-overview">
      <title>Project Overview</title>
      <description>Comprehensive introduction to the project including its purpose, goals, target audience, and overall scope.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>README.md</file_path>
        <file_path>[Key project files]</file_path>
      </relevant_files>
      <related_pages>
        <related>system-architecture</related>
        <related>key-features</related>
      </related_pages>
      <parent_section>introduction</parent_section>
    </page>

    <!-- Architecture Pages -->
    <page id="system-architecture">
      <title>System Architecture Overview</title>
      <description>High-level architecture analysis including component relationships, data flow, and architectural patterns with Mermaid diagrams.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>[Architecture definition files]</file_path>
        <file_path>[Main component files]</file_path>
      </relevant_files>
      <related_pages>
        <related>design-patterns</related>
        <related>component-dependencies</related>
      </related_pages>
      <parent_section>architecture</parent_section>
    </page>
    <page id="design-patterns">
      <title>Design Patterns Analysis</title>
      <description>Identification and analysis of all design patterns used (Singleton, Factory, Observer, Strategy, Decorator, Adapter, etc.) with usage evaluation and alternative suggestions.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>[Files implementing design patterns]</file_path>
      </relevant_files>
      <related_pages>
        <related>system-architecture</related>
        <related>srp-analysis</related>
      </related_pages>
      <parent_section>architecture</parent_section>
    </page>

    <!-- SOLID Principles Pages -->
    <page id="srp-analysis">
      <title>Single Responsibility Principle (SRP)</title>
      <description>Detailed analysis of SRP adherence including score (0-4), strengths, areas for improvement, and specific code examples demonstrating the principle.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>[Files demonstrating SRP or violations]</file_path>
      </relevant_files>
      <related_pages>
        <related>ocp-analysis</related>
        <related>design-patterns</related>
      </related_pages>
      <parent_section>solid-principles</parent_section>
    </page>
    <page id="ocp-analysis">
      <title>Open/Closed Principle (OCP)</title>
      <description>Detailed analysis of OCP adherence including score (0-4), strengths, areas for improvement, and specific code examples demonstrating the principle.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>[Files demonstrating OCP or violations]</file_path>
      </relevant_files>
      <related_pages>
        <related>srp-analysis</related>
        <related>lsp-analysis</related>
      </related_pages>
      <parent_section>solid-principles</parent_section>
    </page>
    <page id="lsp-analysis">
      <title>Liskov Substitution Principle (LSP)</title>
      <description>Detailed analysis of LSP adherence including score (0-4), strengths, areas for improvement, and specific code examples demonstrating the principle.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>[Files demonstrating LSP or violations]</file_path>
      </relevant_files>
      <related_pages>
        <related>ocp-analysis</related>
        <related>isp-analysis</related>
      </related_pages>
      <parent_section>solid-principles</parent_section>
    </page>
    <page id="isp-analysis">
      <title>Interface Segregation Principle (ISP)</title>
      <description>Detailed analysis of ISP adherence including score (0-4), strengths, areas for improvement, and specific code examples demonstrating the principle.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>[Files demonstrating ISP or violations]</file_path>
      </relevant_files>
      <related_pages>
        <related>lsp-analysis</related>
        <related>dip-analysis</related>
      </related_pages>
      <parent_section>solid-principles</parent_section>
    </page>
    <page id="dip-analysis">
      <title>Dependency Inversion Principle (DIP)</title>
      <description>Detailed analysis of DIP adherence including score (0-4), strengths, areas for improvement, and specific code examples demonstrating the principle.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>[Files demonstrating DIP or violations]</file_path>
      </relevant_files>
      <related_pages>
        <related>isp-analysis</related>
        <related>solid-summary</related>
      </related_pages>
      <parent_section>solid-principles</parent_section>
    </page>
    <page id="solid-summary">
      <title>SOLID Principles Summary</title>
      <description>Summary of all SOLID principles analysis with total score (0-20), overall assessment, and comprehensive recommendations for improvement.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>[Key implementation files]</file_path>
      </relevant_files>
      <related_pages>
        <related>code-readability</related>
        <related>coupling-analysis</related>
      </related_pages>
      <parent_section>solid-principles</parent_section>
    </page>

    <!-- Quality Built-In Pages -->
    <page id="code-readability">
      <title>Code Readability and Maintainability</title>
      <description>Evaluation of code clarity, naming conventions, documentation, code organization, and adherence to DRY principle.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>[Core implementation files]</file_path>
      </relevant_files>
      <related_pages>
        <related>test-coverage</related>
        <related>code-smells-refactoring</related>
      </related_pages>
      <parent_section>quality</parent_section>
    </page>
    <page id="test-coverage">
      <title>Test Coverage and Quality</title>
      <description>Assessment of test coverage, test quality, error handling, edge cases, logging, and debugging capabilities.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>[Test files]</file_path>
        <file_path>[Core files to be tested]</file_path>
      </relevant_files>
      <related_pages>
        <related>code-readability</related>
        <related>performance-security</related>
      </related_pages>
      <parent_section>quality</parent_section>
    </page>
    <page id="performance-security">
      <title>Performance and Security</title>
      <description>Analysis of performance considerations, optimizations, security best practices, input validation, and sanitization.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>[Performance critical files]</file_path>
        <file_path>[Security sensitive files]</file_path>
      </relevant_files>
      <related_pages>
        <related>test-coverage</related>
        <related>code-smells-refactoring</related>
      </related_pages>
      <parent_section>quality</parent_section>
    </page>
    <page id="code-smells-refactoring">
      <title>Code Smells and Refactoring</title>
      <description>Identification of code smells (Long Method, Large Class, Duplicate Code, Feature Envy, etc.) and specific refactoring recommendations.</description>
      <importance>medium</importance>
      <relevant_files>
        <file_path>[Files with potential code smells]</file_path>
      </relevant_files>
      <related_pages>
        <related>code-readability</related>
        <related>coupling-analysis</related>
      </related_pages>
      <parent_section>quality</parent_section>
    </page>

    <!-- Dependency Management Pages -->
    <page id="coupling-analysis">
      <title>Coupling Analysis</title>
      <description>Analysis of coupling between modules/components, identification of tight coupling, and recommendations for loose coupling.</description>
      <importance>medium</importance>
      <relevant_files>
        <file_path>[Files with module dependencies]</file_path>
      </relevant_files>
      <related_pages>
        <related>dependency-flow</related>
        <related>abstraction-usage</related>
      </related_pages>
      <parent_section>dependency</parent_section>
    </page>
    <page id="dependency-flow">
      <title>Dependency Direction and Flow</title>
      <description>Evaluation of dependency direction, flow patterns, and architectural layering with dependency flow diagrams.</description>
      <importance>medium</importance>
      <relevant_files>
        <file_path>[Files demonstrating dependency flow]</file_path>
      </relevant_files>
      <related_pages>
        <related>coupling-analysis</related>
        <related>circular-dependencies</related>
      </related_pages>
      <parent_section>dependency</parent_section>
    </page>
    <page id="circular-dependencies">
      <title>Circular Dependency Identification</title>
      <description>Identification of circular dependencies and their impact on code maintainability with resolution strategies.</description>
      <importance>medium</importance>
      <relevant_files>
        <file_path>[Files with potential circular dependencies]</file_path>
      </relevant_files>
      <related_pages>
        <related>dependency-flow</related>
        <related>decoupling-recommendations</related>
      </related_pages>
      <parent_section>dependency</parent_section>
    </page>
    <page id="decoupling-recommendations">
      <title>Decoupling Recommendations</title>
      <description>Specific recommendations for improving decoupling, using dependency injection, interfaces, and architectural patterns.</description>
      <importance>medium</importance>
      <relevant_files>
        <file_path>[Tightly coupled files]</file_path>
      </relevant_files>
      <related_pages>
        <related>circular-dependencies</related>
        <related>interface-design</related>
      </related_pages>
      <parent_section>dependency</parent_section>
    </page>

    <!-- Abstraction Levels Pages -->
    <page id="abstraction-usage">
      <title>Abstraction Usage</title>
      <description>Assessment of appropriate use of abstraction, abstraction levels, and balance between concrete and abstract implementations.</description>
      <importance>medium</importance>
      <relevant_files>
        <file_path>[Files using abstraction]</file_path>
      </relevant_files>
      <related_pages>
        <related>interface-design</related>
        <related>encapsulation</related>
      </related_pages>
      <parent_section>abstraction</parent_section>
    </page>
    <page id="interface-design">
      <title>Interface Design Evaluation</title>
      <description>Evaluation of interface design, interface segregation, abstraction contracts, and API design principles.</description>
      <importance>medium</importance>
      <relevant_files>
        <file_path>[Interface definition files]</file_path>
      </relevant_files>
      <related_pages>
        <related>abstraction-usage</related>
        <related>encapsulation</related>
      </related_pages>
      <parent_section>abstraction</parent_section>
    </page>
    <page id="encapsulation">
      <title>Encapsulation and Information Hiding</title>
      <description>Analysis of encapsulation practices, information hiding, data protection, and access control.</description>
      <importance>medium</importance>
      <relevant_files>
        <file_path>[Files with encapsulation]</file_path>
      </relevant_files>
      <related_pages>
        <related>interface-design</related>
        <related>abstraction-hierarchy</related>
      </related_pages>
      <parent_section>abstraction</parent_section>
    </page>
    <page id="abstraction-hierarchy">
      <title>Abstraction Hierarchy Assessment</title>
      <description>Evaluation of abstraction hierarchies, inheritance structures, and proper abstraction layering.</description>
      <importance>medium</importance>
      <relevant_files>
        <file_path>[Files with inheritance hierarchies]</file_path>
      </relevant_files>
      <related_pages>
        <related>encapsulation</related>
        <related>key-findings</related>
      </related_pages>
      <parent_section>abstraction</parent_section>
    </page>

    <!-- Conclusion Pages -->
    <page id="key-findings">
      <title>Key Findings Summary</title>
      <description>Summary of key findings from all analysis dimensions including architecture, SOLID principles, quality, dependencies, and abstraction.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>[Key project files]</file_path>
      </relevant_files>
      <related_pages>
        <related>quality-assessment</related>
        <related>recommendations</related>
      </related_pages>
      <parent_section>conclusion</parent_section>
    </page>
    <page id="quality-assessment">
      <title>Overall Code Quality Assessment</title>
      <description>Overall assessment of code quality across all dimensions with aggregate scoring and comparison to best practices.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>[Core implementation files]</file_path>
      </relevant_files>
      <related_pages>
        <related>key-findings</related>
        <related>recommendations</related>
      </related_pages>
      <parent_section>conclusion</parent_section>
    </page>
    <page id="recommendations">
      <title>Recommendations for Improvements</title>
      <description>Comprehensive recommendations for improving code quality, architecture, SOLID principles adherence, and overall maintainability.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>[Files needing improvement]</file_path>
      </relevant_files>
      <related_pages>
        <related>quality-assessment</related>
        <related>code-smells-refactoring</related>
      </related_pages>
      <parent_section>conclusion</parent_section>
    </page>
    <!-- More pages as needed -->
  </pages>
</wiki_structure>
` : `
IMPORTANT: The wiki content will be generated in ${language === 'en' ? 'English' :
            language === 'ja' ? 'Japanese (日本語)' :
            language === 'zh' ? 'Mandarin Chinese (中文)' :
            language === 'zh-tw' ? 'Traditional Chinese (繁體中文)' :
            language === 'es' ? 'Spanish (Español)' :
            language === 'kr' ? 'Korean (한国語)' :
            language === 'vi' ? 'Vietnamese (Tiếng Việt)' :
            language === "pt-br" ? "Brazilian Portuguese (Português Brasileiro)" :
            language === "fr" ? "Français (French)" :
            language === "ru" ? "Русский (Russian)" :
            'English'} language.

For a concise wiki, follow the SAME 7-section sequential structure with simplified analysis and scoring for each section:

Return your analysis in the following XML format:

<wiki_structure>
  <title>[Overall title for the wiki]</title>
  <description>[Brief description of the repository and its codebase]</description>
  <sections>
    <section id="introduction">
      <title>1. Introduction</title>
      <pages>
        <page_ref>introduction</page_ref>
      </pages>
    </section>
    <section id="architecture">
      <title>2. Architecture Design</title>
      <pages>
        <page_ref>architecture-design</page_ref>
      </pages>
    </section>
    <section id="solid-principles">
      <title>3. SOLID Principles Analysis</title>
      <pages>
        <page_ref>solid-principles</page_ref>
      </pages>
    </section>
    <section id="quality">
      <title>4. Quality Built-In Analysis</title>
      <pages>
        <page_ref>quality-analysis</page_ref>
      </pages>
    </section>
    <section id="dependency">
      <title>5. Dependency Management</title>
      <pages>
        <page_ref>dependency-management</page_ref>
      </pages>
    </section>
    <section id="abstraction">
      <title>6. Abstraction Levels</title>
      <pages>
        <page_ref>abstraction-levels</page_ref>
      </pages>
    </section>
    <section id="conclusion">
      <title>7. Conclusion/Summary</title>
      <pages>
        <page_ref>conclusion</page_ref>
      </pages>
    </section>
  </sections>
  <pages>
    <page id="introduction">
      <title>Introduction</title>
      <description>Concise project introduction, purpose, and key features overview.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>README.md</file_path>
        <file_path>[Key project files]</file_path>
      </relevant_files>
      <related_pages>
        <related>architecture-design</related>
      </related_pages>
      <parent_section>introduction</parent_section>
    </page>
    <page id="architecture-design">
      <title>Architecture Design Analysis</title>
      <description>High-level architecture overview, key design patterns identification with scoring, architectural pattern analysis, and component relationship summary.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>[Key architectural files]</file_path>
      </relevant_files>
      <related_pages>
        <related>solid-principles</related>
      </related_pages>
      <parent_section>architecture</parent_section>
    </page>
    <page id="solid-principles">
      <title>SOLID Principles Analysis</title>
      <description>Comprehensive analysis of all 5 SOLID principles with individual scores (0-4 each), total score (0-20), key strengths, and top improvement areas.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>[Files demonstrating SOLID principles]</file_path>
      </relevant_files>
      <related_pages>
        <related>architecture-design</related>
        <related>quality-analysis</related>
      </related_pages>
      <parent_section>solid-principles</parent_section>
    </page>
    <page id="quality-analysis">
      <title>Quality Built-In Analysis</title>
      <description>Simplified evaluation of code quality including readability score, test coverage assessment, performance considerations, and key code smells identified.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>[Core implementation files]</file_path>
      </relevant_files>
      <related_pages>
        <related>solid-principles</related>
        <related>dependency-management</related>
      </related_pages>
      <parent_section>quality</parent_section>
    </page>
    <page id="dependency-management">
      <title>Dependency Management Analysis</title>
      <description>Analysis of coupling score, dependency flow assessment, circular dependency identification, and decoupling recommendations.</description>
      <importance>medium</importance>
      <relevant_files>
        <file_path>[Files with module dependencies]</file_path>
      </relevant_files>
      <related_pages>
        <related>quality-analysis</related>
        <related>abstraction-levels</related>
      </related_pages>
      <parent_section>dependency</parent_section>
    </page>
    <page id="abstraction-levels">
      <title>Abstraction Levels Assessment</title>
      <description>Evaluation of abstraction usage score, interface design assessment, encapsulation analysis, and abstraction hierarchy summary.</description>
      <importance>medium</importance>
      <relevant_files>
        <file_path>[Files using abstraction]</file_path>
      </related_files>
      <related_pages>
        <related>dependency-management</related>
        <related>conclusion</related>
      </related_pages>
      <parent_section>abstraction</parent_section>
    </page>
    <page id="conclusion">
      <title>Conclusion and Recommendations</title>
      <description>Overall code quality score, summary of key findings across all 7 sections, and prioritized improvement recommendations.</description>
      <importance>high</importance>
      <relevant_files>
        <file_path>[Key project files]</file_path>
      </relevant_files>
      <related_pages>
        <related>introduction</related>
      </related_pages>
      <parent_section>conclusion</parent_section>
    </page>
  </pages>
</wiki_structure>
`}

IMPORTANT FORMATTING INSTRUCTIONS:
- Return ONLY the valid XML structure specified above
- DO NOT wrap the XML in markdown code blocks (no \`\`\` or \`\`\`xml)
- DO NOT include any explanation text before or after the XML
- Ensure the XML is properly formatted and valid
- Start directly with <wiki_structure> and end with </wiki_structure>

CRITICAL STRUCTURAL REQUIREMENTS:
1. The wiki MUST follow the exact 7-section sequential order:
   1. Introduction
   2. Architecture Design
   3. SOLID Principles Analysis (CRITICAL - MUST INCLUDE DETAILED SCORING)
   4. Quality Built-In Analysis
   5. Dependency Management
   6. Abstraction Levels
   7. Conclusion/Summary
2. For ${isComprehensiveView ? 'COMPREHENSIVE' : 'CONCISE'} mode:
   ${isComprehensiveView ? `
   - Create 25-30 pages with detailed analysis for each section
   - Each SOLID principle should have its own dedicated page
   - Provide in-depth analysis with multiple code examples per principle
   - Include comprehensive subsections for each dimension` : `
   - Create exactly 7 pages, one for each section
   - Each section should provide simplified analysis with scoring
   - Include key findings and top 3 improvement areas per section
   - Provide summary scores for each dimension (e.g., "Coupling Score: 7/10")
   - Focus on most critical insights and actionable recommendations`}
3. Each section MUST contain relevant pages that provide analysis
4. The relevant_files should be actual files from the repository
5. For SOLID Principles Analysis section, ensure comprehensive coverage:
   - All 5 principles analyzed individually (SRP, OCP, LSP, ISP, DIP)
   - Each principle scored 0-4 with strengths and areas for improvement
   - Total score calculated (0-20)
   - ${isComprehensiveView ? 'Multiple specific code examples for each principle' : 'Key code examples illustrating main points'}
6. Return ONLY valid XML with no markdown code block delimiters`
        }]
      };

      // Add tokens if available
      addTokensToRequestBody(requestBody, currentToken, effectiveRepoInfo.type, selectedProviderState, selectedModelState, isCustomSelectedModelState, customSelectedModelState, language, modelExcludedDirs, modelExcludedFiles, modelIncludedDirs, modelIncludedFiles);

      // Use WebSocket for communication
      let responseText = '';

      try {
        // Create WebSocket URL from the server base URL
        const serverBaseUrl = process.env.SERVER_BASE_URL || 'http://localhost:8001';
        const wsBaseUrl = serverBaseUrl.replace(/^http/, 'ws')? serverBaseUrl.replace(/^https/, 'wss'): serverBaseUrl.replace(/^http/, 'ws');
        const wsUrl = `${wsBaseUrl}/ws/chat`;

        // Create a new WebSocket connection
        const ws = new WebSocket(wsUrl);

        // Create a promise that resolves when the WebSocket connection is complete
        await new Promise<void>((resolve, reject) => {
          // Set up event handlers
          ws.onopen = () => {
            console.log('WebSocket connection established for wiki structure');
            // Send the request as JSON
            ws.send(JSON.stringify(requestBody));
            resolve();
          };

          ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            reject(new Error('WebSocket connection failed'));
          };

          // If the connection doesn't open within 5 seconds, fall back to HTTP
          const timeout = setTimeout(() => {
            reject(new Error('WebSocket connection timeout'));
          }, 5000);

          // Clear the timeout if the connection opens successfully
          ws.onopen = () => {
            clearTimeout(timeout);
            console.log('WebSocket connection established for wiki structure');
            // Send the request as JSON
            ws.send(JSON.stringify(requestBody));
            resolve();
          };
        });

        // Create a promise that resolves when the WebSocket response is complete
        await new Promise<void>((resolve, reject) => {
          // Handle incoming messages
          ws.onmessage = (event) => {
            responseText += event.data;
          };

          // Handle WebSocket close
          ws.onclose = () => {
            console.log('WebSocket connection closed for wiki structure');
            resolve();
          };

          // Handle WebSocket errors
          ws.onerror = (error) => {
            console.error('WebSocket error during message reception:', error);
            reject(new Error('WebSocket error during message reception'));
          };
        });
      } catch (wsError) {
        console.error('WebSocket error, falling back to HTTP:', wsError);

        // Fall back to HTTP if WebSocket fails
        const response = await fetch(`/api/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`Error determining wiki structure: ${response.status}`);
        }

        // Process the response
        responseText = '';
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('Failed to get response reader');
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          responseText += decoder.decode(value, { stream: true });
        }
      }

      if(responseText.includes('Error preparing retriever: Environment variable OPENAI_API_KEY must be set')) {
         setEmbeddingError(true);
         throw new Error('OPENAI_API_KEY environment variable is not set. Please configure your OpenAI API key.');
       }

       if(responseText.includes('Ollama model') && responseText.includes('not found')) {
         setEmbeddingError(true);
         throw new Error('The specified Ollama embedding model was not found. Please ensure the model is installed locally or select a different embedding model in the configuration.');
       }

        // Clean up markdown delimiters
      responseText = responseText.replace(/^```(?:xml)?\s*/i, '').replace(/```\s*$/i, '');

      // Extract wiki structure from response
      const xmlMatch = responseText.match(/<wiki_structure>[\s\S]*?<\/wiki_structure>/m);
      if (!xmlMatch) {
        throw new Error('No valid XML found in response');
      }

      let xmlText = xmlMatch[0];
      xmlText = xmlText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      // Try parsing with DOMParser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");

      // Check for parsing errors
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        // Log the first few elements to see what was parsed
        const elements = xmlDoc.querySelectorAll('*');
        if (elements.length > 0) {
          console.log('First 5 element names:',
            Array.from(elements).slice(0, 5).map(el => el.nodeName).join(', '));
        }

        // We'll continue anyway since the XML might still be usable
      }

      // Extract wiki structure
      let title = '';
      let description = '';
      let pages: WikiPage[] = [];

      // Try using DOM parsing first
      const titleEl = xmlDoc.querySelector('title');
      const descriptionEl = xmlDoc.querySelector('description');
      const pagesEls = xmlDoc.querySelectorAll('page');

      title = titleEl ? titleEl.textContent || '' : '';
      description = descriptionEl ? descriptionEl.textContent || '' : '';

      // Parse pages using DOM
      pages = [];

      if (parseError && (!pagesEls || pagesEls.length === 0)) {
        console.warn('DOM parsing failed, trying regex fallback');
      }

      pagesEls.forEach(pageEl => {
        const id = pageEl.getAttribute('id') || `page-${pages.length + 1}`;
        const titleEl = pageEl.querySelector('title');
        const importanceEl = pageEl.querySelector('importance');
        const filePathEls = pageEl.querySelectorAll('file_path');
        const relatedEls = pageEl.querySelectorAll('related');

        const title = titleEl ? titleEl.textContent || '' : '';
        const importance = importanceEl ?
          (importanceEl.textContent === 'high' ? 'high' :
            importanceEl.textContent === 'medium' ? 'medium' : 'low') : 'medium';

        const filePaths: string[] = [];
        filePathEls.forEach(el => {
          if (el.textContent) filePaths.push(el.textContent);
        });

        const relatedPages: string[] = [];
        relatedEls.forEach(el => {
          if (el.textContent) relatedPages.push(el.textContent);
        });

        pages.push({
          id,
          title,
          content: '', // Will be generated later
          filePaths,
          importance,
          relatedPages
        });
      });

      // Extract sections if they exist in the XML
      const sections: WikiSection[] = [];
      const rootSections: string[] = [];

      // Try to parse sections if we're in comprehensive view
      if (isComprehensiveView) {
        const sectionsEls = xmlDoc.querySelectorAll('section');

        if (sectionsEls && sectionsEls.length > 0) {
          // Process sections
          sectionsEls.forEach(sectionEl => {
            const id = sectionEl.getAttribute('id') || `section-${sections.length + 1}`;
            const titleEl = sectionEl.querySelector('title');
            const pageRefEls = sectionEl.querySelectorAll('page_ref');
            const sectionRefEls = sectionEl.querySelectorAll('section_ref');

            const title = titleEl ? titleEl.textContent || '' : '';
            const pages: string[] = [];
            const subsections: string[] = [];

            pageRefEls.forEach(el => {
              if (el.textContent) pages.push(el.textContent);
            });

            sectionRefEls.forEach(el => {
              if (el.textContent) subsections.push(el.textContent);
            });

            sections.push({
              id,
              title,
              pages,
              subsections: subsections.length > 0 ? subsections : undefined
            });

            // Check if this is a root section (not referenced by any other section)
            let isReferenced = false;
            sectionsEls.forEach(otherSection => {
              const otherSectionRefs = otherSection.querySelectorAll('section_ref');
              otherSectionRefs.forEach(ref => {
                if (ref.textContent === id) {
                  isReferenced = true;
                }
              });
            });

            if (!isReferenced) {
              rootSections.push(id);
            }
          });
        }
      }

      // Create wiki structure
      const wikiStructure: WikiStructure = {
        id: 'wiki',
        title,
        description,
        pages,
        sections,
        rootSections
      };

      setWikiStructure(wikiStructure);
      setCurrentPageId(pages.length > 0 ? pages[0].id : undefined);

      // Start generating content for all pages with controlled concurrency
      if (pages.length > 0) {
        // Mark all pages as in progress
        const initialInProgress = new Set(pages.map(p => p.id));
        setPagesInProgress(initialInProgress);

        console.log(`Starting generation for ${pages.length} pages with controlled concurrency`);

        // Maximum concurrent requests
        const MAX_CONCURRENT = 1;

        // Create a queue of pages
        const queue = [...pages];
        let activeRequests = 0;

        // Function to process next items in queue
        const processQueue = () => {
          // Process as many items as we can up to our concurrency limit
          while (queue.length > 0 && activeRequests < MAX_CONCURRENT) {
            const page = queue.shift();
            if (page) {
              activeRequests++;
              console.log(`Starting page ${page.title} (${activeRequests} active, ${queue.length} remaining)`);

              // Start generating content for this page
              generatePageContent(page, owner, repo)
                .finally(() => {
                  // When done (success or error), decrement active count and process more
                  activeRequests--;
                  console.log(`Finished page ${page.title} (${activeRequests} active, ${queue.length} remaining)`);

                  // Check if all work is done (queue empty and no active requests)
                  if (queue.length === 0 && activeRequests === 0) {
                    console.log("All page generation tasks completed.");
                    setIsLoading(false);
                    setLoadingMessage(undefined);
                  } else {
                    // Only process more if there are items remaining and we're under capacity
                    if (queue.length > 0 && activeRequests < MAX_CONCURRENT) {
                      processQueue();
                    }
                  }
                });
            }
          }

          // Additional check: If the queue started empty or becomes empty and no requests were started/active
          if (queue.length === 0 && activeRequests === 0 && pages.length > 0 && pagesInProgress.size === 0) {
            // This handles the case where the queue might finish before the finally blocks fully update activeRequests
            // or if the initial queue was processed very quickly
            console.log("Queue empty and no active requests after loop, ensuring loading is false.");
            setIsLoading(false);
            setLoadingMessage(undefined);
          } else if (pages.length === 0) {
            // Handle case where there were no pages to begin with
            setIsLoading(false);
            setLoadingMessage(undefined);
          }
        };

        // Start processing the queue
        processQueue();
      } else {
        // Set loading to false if there were no pages found
        setIsLoading(false);
        setLoadingMessage(undefined);
      }

    } catch (error) {
      console.error('Error determining wiki structure:', error);
      setIsLoading(false);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setLoadingMessage(undefined);
    } finally {
      setStructureRequestInProgress(false);
    }
  }, [generatePageContent, currentToken, effectiveRepoInfo, pagesInProgress.size, structureRequestInProgress, selectedProviderState, selectedModelState, isCustomSelectedModelState, customSelectedModelState, modelExcludedDirs, modelExcludedFiles, language, messages.loading, isComprehensiveView]);

  // Fetch repository structure using GitHub or GitLab API
  const fetchRepositoryStructure = useCallback(async () => {
    // If a request is already in progress, don't start another one
    if (requestInProgress) {
      console.log('Repository fetch already in progress, skipping duplicate call');
      return;
    }

    // Reset previous state
    setWikiStructure(undefined);
    setCurrentPageId(undefined);
    setGeneratedPages({});
    setPagesInProgress(new Set());
    setError(null);
    setEmbeddingError(false); // Reset embedding error state

    try {
      // Set the request in progress flag
      setRequestInProgress(true);

      // Update loading state
      setIsLoading(true);
      setLoadingMessage(messages.loading?.fetchingStructure || 'Fetching repository structure...');

      let fileTreeData = '';
      let readmeContent = '';

      if (effectiveRepoInfo.type === 'local' && effectiveRepoInfo.localPath) {
        try {
          const response = await fetch(`/local_repo/structure?path=${encodeURIComponent(effectiveRepoInfo.localPath)}`);

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Local repository API error (${response.status}): ${errorData}`);
          }

          const data = await response.json();
          fileTreeData = data.file_tree;
          readmeContent = data.readme;
          // For local repos, we can't determine the actual branch, so use 'main' as default
          setDefaultBranch('main');
        } catch (err) {
          throw err;
        }
      } else if (effectiveRepoInfo.type === 'github') {
        // GitHub API approach
        // Try to get the tree data for common branch names
        let treeData = null;
        let apiErrorDetails = '';

        // Determine the GitHub API base URL based on the repository URL
        const getGithubApiUrl = (repoUrl: string | null): string => {
          if (!repoUrl) {
            return 'https://api.github.com'; // Default to public GitHub
          }
          
          try {
            const url = new URL(repoUrl);
            const hostname = url.hostname;
            
            // If it's the public GitHub, use the standard API URL
            if (hostname === 'github.com') {
              return 'https://api.github.com';
            }
            
            // For GitHub Enterprise, use the enterprise API URL format
            // GitHub Enterprise API URL format: https://github.company.com/api/v3
            return `${url.protocol}//${hostname}/api/v3`;
          } catch {
            return 'https://api.github.com'; // Fallback to public GitHub if URL parsing fails
          }
        };

        const githubApiBaseUrl = getGithubApiUrl(effectiveRepoInfo.repoUrl);
        // First, try to get the default branch from the repository info
        let defaultBranchLocal = null;
        try {
          const repoInfoResponse = await fetch(`${githubApiBaseUrl}/repos/${owner}/${repo}`, {
            headers: createGithubHeaders(currentToken)
          });
          
          if (repoInfoResponse.ok) {
            const repoData = await repoInfoResponse.json();
            defaultBranchLocal = repoData.default_branch;
            console.log(`Found default branch: ${defaultBranchLocal}`);
            // Store the default branch in state
            setDefaultBranch(defaultBranchLocal || 'main');
          }
        } catch (err) {
          console.warn('Could not fetch repository info for default branch:', err);
        }

        // Create list of branches to try, prioritizing the actual default branch
        const branchesToTry = defaultBranchLocal 
          ? [defaultBranchLocal, 'main', 'master'].filter((branch, index, arr) => arr.indexOf(branch) === index)
          : ['main', 'master'];

        for (const branch of branchesToTry) {
          const apiUrl = `${githubApiBaseUrl}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
          const headers = createGithubHeaders(currentToken);

          console.log(`Fetching repository structure from branch: ${branch}`);
          try {
            const response = await fetch(apiUrl, {
              headers
            });

            if (response.ok) {
              treeData = await response.json();
              console.log('Successfully fetched repository structure');
              break;
            } else {
              const errorData = await response.text();
              apiErrorDetails = `Status: ${response.status}, Response: ${errorData}`;
              console.error(`Error fetching repository structure: ${apiErrorDetails}`);
            }
          } catch (err) {
            console.error(`Network error fetching branch ${branch}:`, err);
          }
        }

        if (!treeData || !treeData.tree) {
          if (apiErrorDetails) {
            throw new Error(`Could not fetch repository structure. API Error: ${apiErrorDetails}`);
          } else {
            throw new Error('Could not fetch repository structure. Repository might not exist, be empty or private.');
          }
        }

        // Convert tree data to a string representation
        fileTreeData = treeData.tree
          .filter((item: { type: string; path: string }) => item.type === 'blob')
          .map((item: { type: string; path: string }) => item.path)
          .join('\n');

        // Try to fetch README.md content
        try {
          const headers = createGithubHeaders(currentToken);

          const readmeResponse = await fetch(`${githubApiBaseUrl}/repos/${owner}/${repo}/readme`, {
            headers
          });

          if (readmeResponse.ok) {
            const readmeData = await readmeResponse.json();
            readmeContent = atob(readmeData.content);
          } else {
            console.warn(`Could not fetch README.md, status: ${readmeResponse.status}`);
          }
        } catch (err) {
          console.warn('Could not fetch README.md, continuing with empty README', err);
        }
      }
      else if (effectiveRepoInfo.type === 'gitlab') {
        // GitLab API approach
        const projectPath = extractUrlPath(effectiveRepoInfo.repoUrl ?? '')?.replace(/\.git$/, '') || `${owner}/${repo}`;
        const projectDomain = extractUrlDomain(effectiveRepoInfo.repoUrl ?? "https://gitlab.com");
        const encodedProjectPath = encodeURIComponent(projectPath);

        const headers = createGitlabHeaders(currentToken);

        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const filesData: any[] = [];

        try {
          // Step 1: Get project info to determine default branch
          let projectInfoUrl: string;
          let defaultBranchLocal = 'main'; // fallback
          try {
            const validatedUrl = new URL(projectDomain ?? ''); // Validate domain
            projectInfoUrl = `${validatedUrl.origin}/api/v4/projects/${encodedProjectPath}`;
          } catch (err) {
            throw new Error(`Invalid project domain URL: ${projectDomain}`);
          }
          const projectInfoRes = await fetch(projectInfoUrl, { headers });

          if (!projectInfoRes.ok) {
            const errorData = await projectInfoRes.text();
            throw new Error(`GitLab project info error: Status ${projectInfoRes.status}, Response: ${errorData}`);
          }

          const projectInfo = await projectInfoRes.json();
          defaultBranchLocal = projectInfo.default_branch || 'main';
          console.log(`Found GitLab default branch: ${defaultBranchLocal}`);
          // Store the default branch in state
          setDefaultBranch(defaultBranchLocal);

          // Step 2: Paginate to fetch full file tree
          let page = 1;
          let morePages = true;
          
          while (morePages) {
            const apiUrl = `${projectInfoUrl}/repository/tree?recursive=true&per_page=100&page=${page}`;
            const response = await fetch(apiUrl, { headers });

            if (!response.ok) {
                const errorData = await response.text();
              throw new Error(`Error fetching GitLab repository structure (page ${page}): ${errorData}`);
            }

            const pageData = await response.json();
            filesData.push(...pageData);

            const nextPage = response.headers.get('x-next-page');
            morePages = !!nextPage;
            page = nextPage ? parseInt(nextPage, 10) : page + 1;
        }

          if (!Array.isArray(filesData) || filesData.length === 0) {
            throw new Error('Could not fetch repository structure. Repository might be empty or inaccessible.');
        }

          // Step 3: Format file paths
        fileTreeData = filesData
          .filter((item: { type: string; path: string }) => item.type === 'blob')
          .map((item: { type: string; path: string }) => item.path)
          .join('\n');

          // Step 4: Try to fetch README.md content
          const readmeUrl = `${projectInfoUrl}/repository/files/README.md/raw`;
            try {
            const readmeResponse = await fetch(readmeUrl, { headers });
              if (readmeResponse.ok) {
                readmeContent = await readmeResponse.text();
                console.log('Successfully fetched GitLab README.md');
              } else {
              console.warn(`Could not fetch GitLab README.md status: ${readmeResponse.status}`);
              }
            } catch (err) {
            console.warn(`Error fetching GitLab README.md:`, err);
            }
        } catch (err) {
          console.error("Error during GitLab repository tree retrieval:", err);
          throw err;
        }
      }
      else if (effectiveRepoInfo.type === 'bitbucket') {
        // Bitbucket API approach
        const repoPath = extractUrlPath(effectiveRepoInfo.repoUrl ?? '') ?? `${owner}/${repo}`;
        const encodedRepoPath = encodeURIComponent(repoPath);

        // Try to get the file tree for common branch names
        let filesData = null;
        let apiErrorDetails = '';
        let defaultBranchLocal = '';
        const headers = createBitbucketHeaders(currentToken);

        // First get project info to determine default branch
        const projectInfoUrl = `https://api.bitbucket.org/2.0/repositories/${encodedRepoPath}`;
        try {
          const response = await fetch(projectInfoUrl, { headers });

          const responseText = await response.text();

          if (response.ok) {
            const projectData = JSON.parse(responseText);
            defaultBranchLocal = projectData.mainbranch.name;
            // Store the default branch in state
            setDefaultBranch(defaultBranchLocal);

            const apiUrl = `https://api.bitbucket.org/2.0/repositories/${encodedRepoPath}/src/${defaultBranchLocal}/?recursive=true&per_page=100`;
            try {
              const response = await fetch(apiUrl, {
                headers
              });

              const structureResponseText = await response.text();

              if (response.ok) {
                filesData = JSON.parse(structureResponseText);
              } else {
                const errorData = structureResponseText;
                apiErrorDetails = `Status: ${response.status}, Response: ${errorData}`;
              }
            } catch (err) {
              console.error(`Network error fetching Bitbucket branch ${defaultBranchLocal}:`, err);
            }
          } else {
            const errorData = responseText;
            apiErrorDetails = `Status: ${response.status}, Response: ${errorData}`;
          }
        } catch (err) {
          console.error("Network error fetching Bitbucket project info:", err);
        }

        if (!filesData || !Array.isArray(filesData.values) || filesData.values.length === 0) {
          if (apiErrorDetails) {
            throw new Error(`Could not fetch repository structure. Bitbucket API Error: ${apiErrorDetails}`);
          } else {
            throw new Error('Could not fetch repository structure. Repository might not exist, be empty or private.');
          }
        }

        // Convert files data to a string representation
        fileTreeData = filesData.values
          .filter((item: { type: string; path: string }) => item.type === 'commit_file')
          .map((item: { type: string; path: string }) => item.path)
          .join('\n');

        // Try to fetch README.md content
        try {
          const headers = createBitbucketHeaders(currentToken);

          const readmeResponse = await fetch(`https://api.bitbucket.org/2.0/repositories/${encodedRepoPath}/src/${defaultBranchLocal}/README.md`, {
            headers
          });

          if (readmeResponse.ok) {
            readmeContent = await readmeResponse.text();
          } else {
            console.warn(`Could not fetch Bitbucket README.md, status: ${readmeResponse.status}`);
          }
        } catch (err) {
          console.warn('Could not fetch Bitbucket README.md, continuing with empty README', err);
        }
      }

      // Now determine the wiki structure
      await determineWikiStructure(fileTreeData, readmeContent, owner, repo);

    } catch (error) {
      console.error('Error fetching repository structure:', error);
      setIsLoading(false);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setLoadingMessage(undefined);
    } finally {
      // Reset the request in progress flag
      setRequestInProgress(false);
    }
  }, [owner, repo, determineWikiStructure, currentToken, effectiveRepoInfo, requestInProgress, messages.loading]);

  // Function to export wiki content
  const exportWiki = useCallback(async (format: 'markdown' | 'json') => {
    if (!wikiStructure || Object.keys(generatedPages).length === 0) {
      setExportError('No wiki content to export');
      return;
    }

    try {
      setIsExporting(true);
      setExportError(null);
      setLoadingMessage(`${language === 'ja' ? 'Wikiを' : 'Exporting wiki as '} ${format} ${language === 'ja' ? 'としてエクスポート中...' : '...'}`);

      // Prepare the pages for export
      const pagesToExport = wikiStructure.pages.map(page => {
        // Use the generated content if available, otherwise use an empty string
        const content = generatedPages[page.id]?.content || 'Content not generated';
        return {
          ...page,
          content
        };
      });

      // Get repository URL
      const repoUrl = getRepoUrl(effectiveRepoInfo);

      // Make API call to export wiki
      const response = await fetch(`/export/wiki`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo_url: repoUrl,
          type: effectiveRepoInfo.type,
          pages: pagesToExport,
          format
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        throw new Error(`Error exporting wiki: ${response.status} - ${errorText}`);
      }

      // Get the filename from the Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${effectiveRepoInfo.repo}_wiki.${format === 'markdown' ? 'md' : 'json'}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.+)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/"/g, '');
        }
      }

      // Convert the response to a blob and download it
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      console.error('Error exporting wiki:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during export';
      setExportError(errorMessage);
    } finally {
      setIsExporting(false);
      setLoadingMessage(undefined);
    }
  }, [wikiStructure, generatedPages, effectiveRepoInfo, language]);

  // No longer needed as we use the modal directly

  const confirmRefresh = useCallback(async (newToken?: string) => {
    setShowModelOptions(false);
    setLoadingMessage(messages.loading?.clearingCache || 'Clearing server cache...');
    setIsLoading(true); // Show loading indicator immediately

    try {
      const params = new URLSearchParams({
        owner: effectiveRepoInfo.owner,
        repo: effectiveRepoInfo.repo,
        repo_type: effectiveRepoInfo.type,
        language: language,
        provider: selectedProviderState,
        model: selectedModelState,
        is_custom_model: isCustomSelectedModelState.toString(),
        custom_model: customSelectedModelState,
        comprehensive: isComprehensiveView.toString(),
        authorization_code: authCode,
      });

      // Add file filters configuration
      if (modelExcludedDirs) {
        params.append('excluded_dirs', modelExcludedDirs);
      }
      if (modelExcludedFiles) {
        params.append('excluded_files', modelExcludedFiles);
      }

      if(authRequired && !authCode) {
        setIsLoading(false);
        console.error("Authorization code is required");
        setError('Authorization code is required');
        return;
      }

      const response = await fetch(`/api/wiki_cache?${params.toString()}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        console.log('Server-side wiki cache cleared successfully.');
        // Optionally, show a success message for cache clearing if desired
        // setLoadingMessage('Cache cleared. Refreshing wiki...');
      } else {
        const errorText = await response.text();
        console.warn(`Failed to clear server-side wiki cache (status: ${response.status}): ${errorText}. Proceeding with refresh anyway.`);
        // Optionally, inform the user about the cache clear failure but that refresh will still attempt
        // setError(\`Cache clear failed: ${errorText}. Trying to refresh...\`);
        if(response.status == 401) {
          setIsLoading(false);
          setLoadingMessage(undefined);
          setError('Failed to validate the authorization code');
          console.error('Failed to validate the authorization code')
          return;
        }
      }
    } catch (err) {
      console.warn('Error calling DELETE /api/wiki_cache:', err);
      setIsLoading(false);
      setEmbeddingError(false); // Reset embedding error state
      // Optionally, inform the user about the cache clear error
      // setError(\`Error clearing cache: ${err instanceof Error ? err.message : String(err)}. Trying to refresh...\`);
      throw err;
    }

    // Update token if provided
    if (newToken) {
      // Update current token state
      setCurrentToken(newToken);
      // Update the URL parameters to include the new token
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('token', newToken);
      window.history.replaceState({}, '', currentUrl.toString());
    }

    // Proceed with the rest of the refresh logic
    console.log('Refreshing wiki. Server cache will be overwritten upon new generation if not cleared.');

    // Clear the localStorage cache (if any remnants or if it was used before this change)
    const localStorageCacheKey = getCacheKey(effectiveRepoInfo.owner, effectiveRepoInfo.repo, effectiveRepoInfo.type, language, isComprehensiveView);
    localStorage.removeItem(localStorageCacheKey);

    // Reset cache loaded flag
    cacheLoadedSuccessfully.current = false;
    effectRan.current = false; // Allow the main data loading useEffect to run again

    // Reset all state
    setWikiStructure(undefined);
    setCurrentPageId(undefined);
    setGeneratedPages({});
    setPagesInProgress(new Set());
    setError(null);
    setEmbeddingError(false); // Reset embedding error state
    setIsLoading(true); // Set loading state for refresh
    setLoadingMessage(messages.loading?.initializing || 'Initializing wiki generation...');

    // Clear any in-progress requests for page content
    activeContentRequests.clear();
    // Reset flags related to request processing if they are component-wide
    setStructureRequestInProgress(false); // Assuming this flag should be reset
    setRequestInProgress(false); // Assuming this flag should be reset

    // Explicitly trigger the data loading process again by re-invoking what the main useEffect does.
    // This will first attempt to load from (now hopefully non-existent or soon-to-be-overwritten) server cache,
    // then proceed to fetchRepositoryStructure if needed.
    // To ensure fetchRepositoryStructure is called if cache is somehow still there or to force a full refresh:
    // One option is to directly call fetchRepositoryStructure() if force refresh means bypassing cache check.
    // For now, we rely on the standard loadData flow initiated by resetting effectRan and dependencies.
    // This will re-trigger the main data loading useEffect.
    // No direct call to fetchRepositoryStructure here, let the useEffect handle it based on effectRan.current = false.
  }, [effectiveRepoInfo, language, messages.loading, activeContentRequests, selectedProviderState, selectedModelState, isCustomSelectedModelState, customSelectedModelState, modelExcludedDirs, modelExcludedFiles, isComprehensiveView, authCode, authRequired]);

  // Start wiki generation when component mounts
  useEffect(() => {
    if (effectRan.current === false) {
      effectRan.current = true; // Set to true immediately to prevent re-entry due to StrictMode

      const loadData = async () => {
        // Try loading from server-side cache first
        setLoadingMessage(messages.loading?.fetchingCache || 'Checking for cached wiki...');
        try {
          const params = new URLSearchParams({
            owner: effectiveRepoInfo.owner,
            repo: effectiveRepoInfo.repo,
            repo_type: effectiveRepoInfo.type,
            language: language,
            comprehensive: isComprehensiveView.toString(),
          });
          const response = await fetch(`/api/wiki_cache?${params.toString()}`);

          if (response.ok) {
            const cachedData = await response.json(); // Returns null if no cache
            if (cachedData && cachedData.wiki_structure && cachedData.generated_pages && Object.keys(cachedData.generated_pages).length > 0) {
              console.log('Using server-cached wiki data');
              if(cachedData.model) {
                setSelectedModelState(cachedData.model);
              }
              if(cachedData.provider) {
                setSelectedProviderState(cachedData.provider);
              }

              // Update repoInfo
              if(cachedData.repo) {
                setEffectiveRepoInfo(cachedData.repo);
              } else if (cachedData.repo_url && !effectiveRepoInfo.repoUrl) {
                const updatedRepoInfo = { ...effectiveRepoInfo, repoUrl: cachedData.repo_url };
                setEffectiveRepoInfo(updatedRepoInfo); // Update effective repo info state
                console.log('Using cached repo_url:', cachedData.repo_url);
              }

              // Ensure the cached structure has sections and rootSections
              const cachedStructure = {
                ...cachedData.wiki_structure,
                sections: cachedData.wiki_structure.sections || [],
                rootSections: cachedData.wiki_structure.rootSections || []
              };

              // If sections or rootSections are missing, create intelligent ones based on page titles
              if (!cachedStructure.sections.length || !cachedStructure.rootSections.length) {
                const pages = cachedStructure.pages;
                const sections: WikiSection[] = [];
                const rootSections: string[] = [];

                // Group pages by common prefixes or categories
                const pageClusters = new Map<string, WikiPage[]>();

                // Define common categories that might appear in page titles
                const categories = [
                  { id: 'overview', title: 'Overview', keywords: ['overview', 'introduction', 'about'] },
                  { id: 'architecture', title: 'Architecture', keywords: ['architecture', 'structure', 'design', 'system'] },
                  { id: 'features', title: 'Core Features', keywords: ['feature', 'functionality', 'core'] },
                  { id: 'components', title: 'Components', keywords: ['component', 'module', 'widget'] },
                  { id: 'api', title: 'API', keywords: ['api', 'endpoint', 'service', 'server'] },
                  { id: 'data', title: 'Data Flow', keywords: ['data', 'flow', 'pipeline', 'storage'] },
                  { id: 'models', title: 'Models', keywords: ['model', 'ai', 'ml', 'integration'] },
                  { id: 'ui', title: 'User Interface', keywords: ['ui', 'interface', 'frontend', 'page'] },
                  { id: 'setup', title: 'Setup & Configuration', keywords: ['setup', 'config', 'installation', 'deploy'] }
                ];

                // Initialize clusters with empty arrays
                categories.forEach(category => {
                  pageClusters.set(category.id, []);
                });

                // Add an "Other" category for pages that don't match any category
                pageClusters.set('other', []);

                // Assign pages to categories based on title keywords
                pages.forEach((page: WikiPage) => {
                  const title = page.title.toLowerCase();
                  let assigned = false;

                  // Try to find a matching category
                  for (const category of categories) {
                    if (category.keywords.some(keyword => title.includes(keyword))) {
                      pageClusters.get(category.id)?.push(page);
                      assigned = true;
                      break;
                    }
                  }

                  // If no category matched, put in "Other"
                  if (!assigned) {
                    pageClusters.get('other')?.push(page);
                  }
                });

                // Create sections for non-empty categories
                for (const [categoryId, categoryPages] of pageClusters.entries()) {
                  if (categoryPages.length > 0) {
                    const category = categories.find(c => c.id === categoryId) ||
                                    { id: categoryId, title: categoryId === 'other' ? 'Other' : categoryId.charAt(0).toUpperCase() + categoryId.slice(1) };

                    const sectionId = `section-${categoryId}`;
                    sections.push({
                      id: sectionId,
                      title: category.title,
                      pages: categoryPages.map((p: WikiPage) => p.id)
                    });
                    rootSections.push(sectionId);

                    // Update page parentId
                    categoryPages.forEach((page: WikiPage) => {
                      page.parentId = sectionId;
                    });
                  }
                }

                // If we still have no sections (unlikely), fall back to importance-based grouping
                if (sections.length === 0) {
                  const highImportancePages = pages.filter((p: WikiPage) => p.importance === 'high').map((p: WikiPage) => p.id);
                  const mediumImportancePages = pages.filter((p: WikiPage) => p.importance === 'medium').map((p: WikiPage) => p.id);
                  const lowImportancePages = pages.filter((p: WikiPage) => p.importance === 'low').map((p: WikiPage) => p.id);

                  if (highImportancePages.length > 0) {
                    sections.push({
                      id: 'section-high',
                      title: 'Core Components',
                      pages: highImportancePages
                    });
                    rootSections.push('section-high');
                  }

                  if (mediumImportancePages.length > 0) {
                    sections.push({
                      id: 'section-medium',
                      title: 'Key Features',
                      pages: mediumImportancePages
                    });
                    rootSections.push('section-medium');
                  }

                  if (lowImportancePages.length > 0) {
                    sections.push({
                      id: 'section-low',
                      title: 'Additional Information',
                      pages: lowImportancePages
                    });
                    rootSections.push('section-low');
                  }
                }

                cachedStructure.sections = sections;
                cachedStructure.rootSections = rootSections;
              }

              setWikiStructure(cachedStructure);
              setGeneratedPages(cachedData.generated_pages);
              setCurrentPageId(cachedStructure.pages.length > 0 ? cachedStructure.pages[0].id : undefined);
              setIsLoading(false);
              setEmbeddingError(false); 
              setLoadingMessage(undefined);
              cacheLoadedSuccessfully.current = true;
              return; // Exit if cache is successfully loaded
            } else {
              console.log('No valid wiki data in server cache or cache is empty.');
            }
          } else {
            // Log error but proceed to fetch structure, as cache is optional
            console.error('Error fetching wiki cache from server:', response.status, await response.text());
          }
        } catch (error) {
          console.error('Error loading from server cache:', error);
          // Proceed to fetch structure if cache loading fails
        }

        // If we reached here, either there was no cache, it was invalid, or an error occurred
        // Proceed to fetch repository structure
        fetchRepositoryStructure();
      };

      loadData();

    } else {
      console.log('Skipping duplicate repository fetch/cache check');
    }

    // Clean up function for this effect is not strictly necessary for loadData,
    // but keeping the main unmount cleanup in the other useEffect
  }, [effectiveRepoInfo, effectiveRepoInfo.owner, effectiveRepoInfo.repo, effectiveRepoInfo.type, language, fetchRepositoryStructure, messages.loading?.fetchingCache, isComprehensiveView]);

  // Save wiki to server-side cache when generation is complete
  useEffect(() => {
    const saveCache = async () => {
      if (!isLoading &&
          !error &&
          wikiStructure &&
          Object.keys(generatedPages).length > 0 &&
          Object.keys(generatedPages).length >= wikiStructure.pages.length &&
          !cacheLoadedSuccessfully.current) {

        const allPagesHaveContent = wikiStructure.pages.every(page =>
          generatedPages[page.id] && generatedPages[page.id].content && generatedPages[page.id].content !== 'Loading...');

        if (allPagesHaveContent) {
          console.log('Attempting to save wiki data to server cache via Next.js proxy');

          try {
            // Make sure wikiStructure has sections and rootSections
            const structureToCache = {
              ...wikiStructure,
              sections: wikiStructure.sections || [],
              rootSections: wikiStructure.rootSections || []
            };
            const dataToCache = {
              repo: effectiveRepoInfo,
              language: language,
              comprehensive: isComprehensiveView,
              wiki_structure: structureToCache,
              generated_pages: generatedPages,
              provider: selectedProviderState,
              model: selectedModelState
            };
            const response = await fetch(`/api/wiki_cache`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(dataToCache),
            });

            if (response.ok) {
              console.log('Wiki data successfully saved to server cache');
            } else {
              console.error('Error saving wiki data to server cache:', response.status, await response.text());
            }
          } catch (error) {
            console.error('Error saving to server cache:', error);
          }
        }
      }
    };

    saveCache();
  }, [isLoading, error, wikiStructure, generatedPages, effectiveRepoInfo.owner, effectiveRepoInfo.repo, effectiveRepoInfo.type, effectiveRepoInfo.repoUrl, repoUrl, language, isComprehensiveView]);

  const handlePageSelect = (pageId: string) => {
    if (currentPageId != pageId) {
      setCurrentPageId(pageId)
    }
  };

  const [isModelSelectionModalOpen, setIsModelSelectionModalOpen] = useState(false);

  return (
    <div className="h-screen paper-texture p-4 md:p-8 flex flex-col">
      <style>{wikiStyles}</style>

      <header className="max-w-[90%] xl:max-w-[1400px] mx-auto mb-8 h-fit w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[var(--accent-primary)] hover:text-[var(--highlight)] flex items-center gap-1.5 transition-colors border-b border-[var(--border-color)] hover:border-[var(--accent-primary)] pb-0.5">
              <FaHome /> {messages.repoPage?.home || 'Home'}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[90%] xl:max-w-[1400px] mx-auto overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 bg-[var(--card-bg)] rounded-lg shadow-custom card-japanese">
            <div className="relative mb-6">
              <div className="absolute -inset-4 bg-[var(--accent-primary)]/10 rounded-full blur-md animate-pulse"></div>
              <div className="relative flex items-center justify-center">
                <div className="w-3 h-3 bg-[var(--accent-primary)]/70 rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-[var(--accent-primary)]/70 rounded-full animate-pulse delay-75 mx-2"></div>
                <div className="w-3 h-3 bg-[var(--accent-primary)]/70 rounded-full animate-pulse delay-150"></div>
              </div>
            </div>
            <p className="text-[var(--foreground)] text-center mb-3 font-serif">
              {loadingMessage || messages.common?.loading || 'Loading...'}
              {isExporting && (messages.loading?.preparingDownload || ' Please wait while we prepare your download...')}
            </p>

            {/* Progress bar for page generation */}
            {wikiStructure && (
              <div className="w-full max-w-md mt-3">
                <div className="bg-[var(--background)]/50 rounded-full h-2 mb-3 overflow-hidden border border-[var(--border-color)]">
                  <div
                    className="bg-[var(--accent-primary)] h-2 rounded-full transition-all duration-300 ease-in-out"
                    style={{
                      width: `${Math.max(5, 100 * (wikiStructure.pages.length - pagesInProgress.size) / wikiStructure.pages.length)}%`
                    }}
                  />
                </div>
                <p className="text-xs text-[var(--muted)] text-center">
                  {language === 'ja'
                    ? `${wikiStructure.pages.length}ページ中${wikiStructure.pages.length - pagesInProgress.size}ページ完了`
                    : messages.repoPage?.pagesCompleted
                        ? messages.repoPage.pagesCompleted
                            .replace('{completed}', (wikiStructure.pages.length - pagesInProgress.size).toString())
                            .replace('{total}', wikiStructure.pages.length.toString())
                        : `${wikiStructure.pages.length - pagesInProgress.size} of ${wikiStructure.pages.length} pages completed`}
                </p>

                {/* Show list of in-progress pages */}
                {pagesInProgress.size > 0 && (
                  <div className="mt-4 text-xs">
                    <p className="text-[var(--muted)] mb-2">
                      {messages.repoPage?.currentlyProcessing || 'Currently processing:'}
                    </p>
                    <ul className="text-[var(--foreground)] space-y-1">
                      {Array.from(pagesInProgress).slice(0, 3).map(pageId => {
                        const page = wikiStructure.pages.find(p => p.id === pageId);
                        return page ? <li key={pageId} className="truncate border-l-2 border-[var(--accent-primary)]/30 pl-2">{page.title}</li> : null;
                      })}
                      {pagesInProgress.size > 3 && (
                        <li className="text-[var(--muted)]">
                          {language === 'ja'
                            ? `...他に${pagesInProgress.size - 3}ページ`
                            : messages.repoPage?.andMorePages
                                ? messages.repoPage.andMorePages.replace('{count}', (pagesInProgress.size - 3).toString())
                                : `...and ${pagesInProgress.size - 3} more`}
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : error ? (
          <div className="bg-[var(--highlight)]/5 border border-[var(--highlight)]/30 rounded-lg p-5 mb-4 shadow-sm">
            <div className="flex items-center text-[var(--highlight)] mb-3">
              <FaExclamationTriangle className="mr-2" />
              <span className="font-bold font-serif">{messages.repoPage?.errorTitle || messages.common?.error || 'Error'}</span>
            </div>
            <p className="text-[var(--foreground)] text-sm mb-3">{error}</p>
            <p className="text-[var(--muted)] text-xs">
              {embeddingError ? (
                messages.repoPage?.embeddingErrorDefault || 'This error is related to the document embedding system used for analyzing your repository. Please verify your embedding model configuration, API keys, and try again. If the issue persists, consider switching to a different embedding provider in the model settings.'
              ) : (
                messages.repoPage?.errorMessageDefault || 'Please check that your repository exists and is public. Valid formats are "owner/repo", "https://github.com/owner/repo", "https://gitlab.com/owner/repo", "https://bitbucket.org/owner/repo", or local folder paths like "C:\\path\\to\\folder" or "/path/to/folder".'
              )}
            </p>
            <div className="mt-5">
              <Link
                href="/"
                className="btn-japanese px-5 py-2 inline-flex items-center gap-1.5"
              >
                <FaHome className="text-sm" />
                {messages.repoPage?.backToHome || 'Back to Home'}
              </Link>
            </div>
          </div>
        ) : wikiStructure ? (
          <div className="h-full overflow-y-auto flex flex-col lg:flex-row gap-4 w-full overflow-hidden bg-[var(--card-bg)] rounded-lg shadow-custom card-japanese">
            {/* Wiki Navigation */}
            <div className="h-full w-full lg:w-[280px] xl:w-[320px] flex-shrink-0 bg-[var(--background)]/50 rounded-lg rounded-r-none p-5 border-b lg:border-b-0 lg:border-r border-[var(--border-color)] overflow-y-auto">
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-3 font-serif">{wikiStructure.title}</h3>
              <p className="text-[var(--muted)] text-sm mb-5 leading-relaxed">{wikiStructure.description}</p>

              {/* Display repository info */}
              <div className="text-xs text-[var(--muted)] mb-5 flex items-center">
                {effectiveRepoInfo.type === 'local' ? (
                  <div className="flex items-center">
                    <FaFolder className="mr-2" />
                    <span className="break-all">{effectiveRepoInfo.localPath}</span>
                  </div>
                ) : (
                  <>
                    {effectiveRepoInfo.type === 'github' ? (
                      <FaGithub className="mr-2" />
                    ) : effectiveRepoInfo.type === 'gitlab' ? (
                      <FaGitlab className="mr-2" />
                    ) : (
                      <FaBitbucket className="mr-2" />
                    )}
                    <a
                      href={effectiveRepoInfo.repoUrl ?? ''}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[var(--accent-primary)] transition-colors border-b border-[var(--border-color)] hover:border-[var(--accent-primary)]"
                    >
                      {effectiveRepoInfo.owner}/{effectiveRepoInfo.repo}
                    </a>
                  </>
                )}
              </div>

              {/* Wiki Type Indicator */}
              <div className="mb-3 flex items-center text-xs text-[var(--muted)]">
                <span className="mr-2">Wiki Type:</span>
                <span className={`px-2 py-0.5 rounded-full ${isComprehensiveView
                  ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                  : 'bg-[var(--background)] text-[var(--foreground)] border border-[var(--border-color)]'}`}>
                  {isComprehensiveView
                    ? (messages.form?.comprehensive || 'Comprehensive')
                    : (messages.form?.concise || 'Concise')}
                </span>
              </div>

              {/* Refresh Wiki button */}
              <div className="mb-5">
                <button
                  onClick={() => setIsModelSelectionModalOpen(true)}
                  disabled={isLoading}
                  className="flex items-center w-full text-xs px-3 py-2 bg-[var(--background)] text-[var(--foreground)] rounded-md hover:bg-[var(--background)]/80 disabled:opacity-50 disabled:cursor-not-allowed border border-[var(--border-color)] transition-colors hover:cursor-pointer"
                >
                  <FaSync className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  {messages.repoPage?.refreshWiki || 'Refresh Wiki'}
                </button>
              </div>

              {/* Export buttons */}
              {Object.keys(generatedPages).length > 0 && (
                <div className="mb-5">
                  <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3 font-serif">
                    {messages.repoPage?.exportWiki || 'Export Wiki'}
                  </h4>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => exportWiki('markdown')}
                      disabled={isExporting}
                      className="btn-japanese flex items-center text-xs px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaDownload className="mr-2" />
                      {messages.repoPage?.exportAsMarkdown || 'Export as Markdown'}
                    </button>
                    <button
                      onClick={() => exportWiki('json')}
                      disabled={isExporting}
                      className="flex items-center text-xs px-3 py-2 bg-[var(--background)] text-[var(--foreground)] rounded-md hover:bg-[var(--background)]/80 disabled:opacity-50 disabled:cursor-not-allowed border border-[var(--border-color)] transition-colors"
                    >
                      <FaFileExport className="mr-2" />
                      {messages.repoPage?.exportAsJson || 'Export as JSON'}
                    </button>
                  </div>
                  {exportError && (
                    <div className="mt-2 text-xs text-[var(--highlight)]">
                      {exportError}
                    </div>
                  )}
                </div>
              )}

              <h4 className="text-md font-semibold text-[var(--foreground)] mb-3 font-serif">
                {messages.repoPage?.pages || 'Pages'}
              </h4>
              <WikiTreeView
                wikiStructure={wikiStructure}
                currentPageId={currentPageId}
                onPageSelect={handlePageSelect}
                messages={messages.repoPage}
              />
            </div>

            {/* Wiki Content */}
            <div id="wiki-content" className="w-full flex-grow p-6 lg:p-8 overflow-y-auto">
              {currentPageId && generatedPages[currentPageId] ? (
                <div className="max-w-[900px] xl:max-w-[1000px] mx-auto">
                  <h3 className="text-xl font-bold text-[var(--foreground)] mb-4 break-words font-serif">
                    {generatedPages[currentPageId].title}
                  </h3>



                  <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none">
                    <Markdown
                      content={generatedPages[currentPageId].content}
                    />
                  </div>

                  {generatedPages[currentPageId].relatedPages.length > 0 && (
                    <div className="mt-8 pt-4 border-t border-[var(--border-color)]">
                      <h4 className="text-sm font-semibold text-[var(--muted)] mb-3">
                        {messages.repoPage?.relatedPages || 'Related Pages:'}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {generatedPages[currentPageId].relatedPages.map(relatedId => {
                          const relatedPage = wikiStructure.pages.find(p => p.id === relatedId);
                          return relatedPage ? (
                            <button
                              key={relatedId}
                              className="bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 text-xs text-[var(--accent-primary)] px-3 py-1.5 rounded-md transition-colors truncate max-w-full border border-[var(--accent-primary)]/20"
                              onClick={() => handlePageSelect(relatedId)}
                            >
                              {relatedPage.title}
                            </button>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-[var(--muted)] h-full">
                  <div className="relative mb-4">
                    <div className="absolute -inset-2 bg-[var(--accent-primary)]/5 rounded-full blur-md"></div>
                    <FaBookOpen className="text-4xl relative z-10" />
                  </div>
                  <p className="font-serif">
                    {messages.repoPage?.selectPagePrompt || 'Select a page from the navigation to view its content'}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>

      <footer className="max-w-[90%] xl:max-w-[1400px] mx-auto mt-8 flex flex-col gap-4 w-full">
        <div className="flex justify-between items-center gap-4 text-center text-[var(--muted)] text-sm h-fit w-full bg-[var(--card-bg)] rounded-lg p-3 shadow-sm border border-[var(--border-color)]">
          <p className="flex-1 font-serif">
            {messages.footer?.copyright || 'DeepWiki - Generate Wiki from GitHub/Gitlab/Bitbucket repositories'}
          </p>
          <ThemeToggle />
        </div>
      </footer>

      {/* Floating Chat Button */}
      {!isLoading && wikiStructure && (
        <button
          onClick={() => setIsAskModalOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[var(--accent-primary)] text-white shadow-lg flex items-center justify-center hover:bg-[var(--accent-primary)]/90 transition-all z-50"
          aria-label={messages.ask?.title || 'Ask about this repository'}
        >
          <FaComments className="text-xl" />
        </button>
      )}

      {/* Ask Modal - Always render but conditionally show/hide */}
      <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isAskModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="bg-[var(--card-bg)] rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-end p-3 absolute top-0 right-0 z-10">
            <button
              onClick={() => {
                // Just close the modal without clearing the conversation
                setIsAskModalOpen(false);
              }}
              className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors bg-[var(--card-bg)]/80 rounded-full p-2"
              aria-label="Close"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <Ask
              repoInfo={effectiveRepoInfo}
              provider={selectedProviderState}
              model={selectedModelState}
              isCustomModel={isCustomSelectedModelState}
              customModel={customSelectedModelState}
              language={language}
              onRef={(ref) => (askComponentRef.current = ref)}
            />
          </div>
        </div>
      </div>

      <ModelSelectionModal
        isOpen={isModelSelectionModalOpen}
        onClose={() => setIsModelSelectionModalOpen(false)}
        provider={selectedProviderState}
        setProvider={setSelectedProviderState}
        model={selectedModelState}
        setModel={setSelectedModelState}
        isCustomModel={isCustomSelectedModelState}
        setIsCustomModel={setIsCustomSelectedModelState}
        customModel={customSelectedModelState}
        setCustomModel={setCustomSelectedModelState}
        isComprehensiveView={isComprehensiveView}
        setIsComprehensiveView={setIsComprehensiveView}
        showFileFilters={true}
        excludedDirs={modelExcludedDirs}
        setExcludedDirs={setModelExcludedDirs}
        excludedFiles={modelExcludedFiles}
        setExcludedFiles={setModelExcludedFiles}
        includedDirs={modelIncludedDirs}
        setIncludedDirs={setModelIncludedDirs}
        includedFiles={modelIncludedFiles}
        setIncludedFiles={setModelIncludedFiles}
        onApply={confirmRefresh}
        showWikiType={true}
        showTokenInput={effectiveRepoInfo.type !== 'local' && !currentToken} // Show token input if not local and no current token
        repositoryType={effectiveRepoInfo.type as 'github' | 'gitlab' | 'bitbucket'}
        authRequired={authRequired}
        authCode={authCode}
        setAuthCode={setAuthCode}
        isAuthLoading={isAuthLoading}
      />
    </div>
  );
}
