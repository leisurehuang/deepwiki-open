# DeepWiki-Open Agent Guidelines

This repository is a Next.js frontend with Python FastAPI backend for generating interactive wikis from Git repositories.

## Build, Lint, and Test Commands

### Frontend (Next.js + TypeScript)
```bash
# Development (with Turbopack)
yarn dev
npm run dev

# Production build
yarn build
npm run build

# Linting
yarn lint
npm run lint

# Start production server
yarn start
npm start
```

### Backend (Python + FastAPI)
```bash
# Install dependencies (Poetry)
python -m pip install poetry==2.0.1 && poetry install -C api

# Start API server (port 8001 by default)
python -m api.main

# Run tests (if applicable)
cd api && poetry run pytest
```

**Note:** No test runner script is configured in package.json. Tests are run manually with pytest in the api directory.

## Code Style Guidelines

### TypeScript/React (Frontend)

#### Imports
- Use `@/*` path alias for src imports (configured in tsconfig.json: `"@/*": ["./src/*"]`)
- Group external imports first, then local imports
- Example: `import { useRouter } from 'next/navigation'; import MyComponent from '@/components/MyComponent';`

#### Component Structure
- Client components must start with `'use client';` directive
- Use React functional components with TypeScript
- Define props with TypeScript interfaces
- Example:
  ```typescript
  interface Props {
    title: string;
    items: string[];
  }

  export default function MyComponent({ title, items }: Props) { ... }
  ```

#### Styling
- Use Tailwind CSS v4 utility classes
- Theme with CSS variables: `--card-bg`, `--accent-primary`, `--foreground`, `--muted`, `--highlight`, `--border-color`
- Custom Japanese aesthetic classes: `input-japanese`, `btn-japanese`, `card-japanese`, `paper-texture`
- Dark mode is selector-based (`data-theme="dark"`)

#### Type Safety
- **NEVER** use `@ts-ignore`, `@ts-expect-error`, or `as any`
- Strict TypeScript mode is enabled
- For `localStorage`/external data: use type assertions with validation
- Example: `const data = JSON.parse(localStorage.getItem('key') || '{}') as MyType;`

#### Error Handling
- Use try/catch with console.error for debugging
- Display user-facing errors in state (`error` variable)
- Example: `catch (err) { console.error('Failed:', err); setError('Operation failed'); }`

#### State Management
- Use React hooks: `useState`, `useEffect`, `useRef`
- Context for global state (e.g., `LanguageContext`)
- Custom hooks in `src/hooks/` directory

### Python (Backend)

#### Code Style
- Follow PEP 8 conventions
- Use FastAPI for endpoints
- Pydantic models for request/response validation
- Example: `class WikiPage(BaseModel): id: str; title: str; ...`

#### Imports
- Use absolute imports from `api` package: `from api.config import GOOGLE_API_KEY`
- External imports before local imports

#### Configuration
- Load configs from `api/config/*.json` via `api.config`
- Use `load_json_config()` for custom config files
- Environment variables loaded via `python-dotenv` in `.env`

#### Logging
- Use configured logger: `logger = logging.getLogger(__name__)`
- Levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Controlled via `LOG_LEVEL` env var (default: INFO)

#### Error Handling
- Use `try/except` with logging
- Raise `HTTPException` for API errors
- Example: `raise HTTPException(status_code=404, detail="Not found")`

#### Async/Await
- Use `async def` for route handlers
- Use `await` for async operations
- Use `asyncio.to_thread()` for blocking I/O operations

## File Organization

### Frontend Structure
```
src/
├── app/              # Next.js app directory (App Router)
│   ├── [owner]/[repo]/  # Dynamic routes for wiki pages
│   └── api/         # API routes (proxy to backend)
├── components/       # React components
│   ├── Mermaid.tsx
│   ├── Markdown.tsx
│   └── ...
├── contexts/         # React contexts
├── hooks/           # Custom React hooks
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── i18n.ts         # Internationalization config
```

### Backend Structure
```
api/
├── main.py          # Entry point, uvicorn server
├── api.py           # FastAPI app, endpoints
├── config.py        # Configuration loading
├── rag.py           # RAG implementation
├── data_pipeline.py # Data processing
├── logging_config.py # Logging setup
└── *_client.py      # Provider clients (openai, google, etc.)
```

## Key Conventions

### Frontend
- **File naming**: kebab-case for files, PascalCase for components
- **Type definitions**: Separate `.tsx` type files in `types/` directory
- **Internationalization**: Use next-intl, locale strings from `messages/{locale}.json`
- **Theme support**: CSS variables for light/dark mode

### Backend
- **File naming**: snake_case for files and variables
- **Type hints**: Use `typing` module (`List`, `Optional`, `Dict`, `Any`)
- **API responses**: Return Pydantic models or JSONResponse
- **Configuration**: JSON-based configs in `api/config/` directory

## Important Notes

- **No tests configured**: Tests not automated in npm scripts; run manually with `pytest` in api dir
- **Environment variables**: Required in `.env` (GOOGLE_API_KEY, OPENAI_API_KEY)
- **Data persistence**: Wiki cache stored in `~/.adalflow/wikicache/`
- **CORS**: Backend allows all origins for development
- **Port defaults**: Frontend 3000, Backend 8001
